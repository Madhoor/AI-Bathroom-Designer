"""
KOHLER India network investigation script.

Purpose:
1. Capture the live PLP API request/response for Freestanding Bathtubs.
2. Capture the complete Design Files interaction for one real product.
   The Design Files flow can be performed manually in the visible browser.

This is an investigation/capture script only. It does not modify products.ts
or build the catalogue.
"""

import base64
import json
import re
from pathlib import Path

from playwright.sync_api import sync_playwright, Request, Response


# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

PLP_URL = "https://www.kohler.co.in/p/bathtubs/shop-freestanding-bathtubs"

PRODUCT_URL = (
    "https://www.kohler.co.in/p/bathtubs/"
    "evok-1-6m-rectangular-freestanding-acrylic-bath-18343t"
    "?skuId=18343T-0"
)

PLP_URL_PATTERN = re.compile(r"/apirequest/search/plp", re.IGNORECASE)

OUT_DIR = Path("data/_debug")
PLP_OUT = OUT_DIR / "plp_capture.json"
DESIGN_OUT = OUT_DIR / "design_files_capture.json"

MAX_BODY_BYTES = 2_000_000

BINARY_CONTENT_TYPE_HINTS = [
    "application/octet-stream",
    "model/",
    "application/zip",
    "application/x-zip",
    "application/pdf",
    "application/step",
    "application/sla",
    "image/",
    "font/",
    "video/",
    "application/vnd.",
]

BINARY_EXT_HINTS = [
    ".obj",
    ".zip",
    ".dwg",
    ".dxf",
    ".stp",
    ".step",
    ".3ds",
    ".skp",
    ".rfa",
    ".rvt",
    ".3dm",
    ".stl",
    ".igs",
    ".iges",
    ".fbx",
    ".pdf",
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def looks_binary(url: str, content_type: str) -> bool:
    ct = (content_type or "").lower()

    if any(hint in ct for hint in BINARY_CONTENT_TYPE_HINTS):
        return True

    low_url = url.lower().split("?")[0]

    return any(low_url.endswith(ext) for ext in BINARY_EXT_HINTS)


def safe_headers(headers: dict) -> dict:
    """
    Keep useful headers while removing the raw cookie jar.
    Authorization is intentionally retained because we may need to know
    whether the Design Files API requires it.
    """
    if not headers:
        return {}

    return {
        k: v
        for k, v in headers.items()
        if k.lower() != "cookie"
    }


def safe_post_data(request: Request):
    """
    Request.post_data can throw when Playwright encounters binary/compressed
    request data. Try text first, then fall back to bytes encoded as base64.
    """
    try:
        data = request.post_data
        if data:
            return {
                "type": "text",
                "value": data,
            }
        return None
    except Exception as text_exc:
        try:
            data_bytes = request.post_data_buffer
            if data_bytes:
                return {
                    "type": "base64",
                    "value": base64.b64encode(data_bytes).decode("ascii"),
                    "length_bytes": len(data_bytes),
                }
        except Exception as buffer_exc:
            return {
                "type": "unavailable",
                "error": (
                    f"post_data error: {text_exc}; "
                    f"post_data_buffer error: {buffer_exc}"
                ),
            }

    return None


def safe_response_body(response: Response):
    """
    Read textual/JSON responses up to MAX_BODY_BYTES.
    Binary CAD/download responses are recorded by headers only.
    """
    content_type = response.headers.get("content-type", "")

    if looks_binary(response.url, content_type):
        return {
            "skipped": True,
            "reason": "binary content-type or file extension",
        }

    try:
        body_bytes = response.body()

        if len(body_bytes) > MAX_BODY_BYTES:
            return {
                "skipped": True,
                "reason": (
                    f"body too large ({len(body_bytes)} bytes > "
                    f"{MAX_BODY_BYTES})"
                ),
            }

        text = body_bytes.decode("utf-8", errors="replace")

        try:
            return {
                "skipped": False,
                "json": json.loads(text),
                "text": None,
            }
        except json.JSONDecodeError:
            return {
                "skipped": False,
                "json": None,
                "text": text,
            }

    except Exception as exc:
        return {
            "error": str(exc),
        }


def is_interesting_url(url: str) -> bool:
    """
    Design Files investigation filter.

    We include API/design/download/asset/CAD/model URLs. Static images,
    fonts and ordinary CSS are ignored for console output, but XHR/fetch
    requests are captured regardless of URL name.
    """
    low = url.lower()

    keywords = (
        "apirequest",
        "design",
        "download",
        "asset",
        "cad",
        "model",
        "3ds",
        "obj",
        "skp",
        "dwg",
        "dxf",
        "rfa",
        "file",
    )

    return any(keyword in low for keyword in keywords)


def dismiss_cookie_banner(page):
    for text in ["Accept All", "Accept", "I Agree", "Allow all", "Got it"]:
        try:
            btn = page.get_by_text(text, exact=False)

            if btn.count() > 0:
                btn.first.click(timeout=2000)
                print(f"Dismissed a banner by clicking: {text}")
                return

        except Exception:
            pass


# ---------------------------------------------------------------------------
# PART 1: PLP API capture
# ---------------------------------------------------------------------------

def capture_plp(playwright):
    print("\n=== PART 1: PLP API capture ===")
    print(f"Opening: {PLP_URL}")

    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context()
    page = context.new_page()

    captured = []

    def on_request(request: Request):
        if PLP_URL_PATTERN.search(request.url):
            print(f"[PLP][request] {request.method} {request.url}")

    def on_response(response: Response):
        if not PLP_URL_PATTERN.search(response.url):
            return

        req = response.request
        content_type = response.headers.get("content-type", "")

        entry = {
            "url": response.url,
            "method": req.method,
            "resource_type": req.resource_type,
            "request_headers": safe_headers(req.headers),
            "post_data": safe_post_data(req),
            "status": response.status,
            "response_headers": safe_headers(response.headers),
            "content_type": content_type,
        }

        body = safe_response_body(response)

        if body.get("skipped"):
            entry["body_skipped_reason"] = body["reason"]
        elif "error" in body:
            entry["body_error"] = body["error"]
        else:
            entry["response_body_json"] = body.get("json")
            entry["response_body_text"] = body.get("text")

        captured.append(entry)

        print(
            f"[PLP][response] {response.status} {response.url} "
            f"content-type={content_type}"
        )

        if entry.get("response_body_json") is not None:
            preview = json.dumps(
                entry["response_body_json"],
                indent=2,
                ensure_ascii=False,
            )[:3000]

            print("  -> JSON body preview:")
            print(preview)

            full_json = json.dumps(entry["response_body_json"])

            if len(full_json) > 3000:
                print("  ... (truncated preview, full body saved)")

    page.on("request", on_request)
    page.on("response", on_response)

    try:
        page.goto(
            PLP_URL,
            wait_until="domcontentloaded",
            timeout=60000,
        )
    except Exception as exc:
        print(f"Navigation warning (continuing anyway): {exc}")

    dismiss_cookie_banner(page)

    page.wait_for_timeout(4000)

    try:
        page.mouse.wheel(0, 2000)
        page.wait_for_timeout(3000)
    except Exception:
        pass

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with open(PLP_OUT, "w", encoding="utf-8") as f:
        json.dump(captured, f, indent=2, ensure_ascii=False)

    print(f"\nCaptured {len(captured)} matching PLP response(s).")
    print(f"Saved to: {PLP_OUT.resolve()}")

    context.close()
    browser.close()

    return captured


# ---------------------------------------------------------------------------
# PART 2: Design Files capture
# ---------------------------------------------------------------------------

def capture_design_files(playwright):
    print("\n=== PART 2: Design Files capture ===")
    print(f"Opening: {PRODUCT_URL}")

    browser = playwright.chromium.launch(headless=False)
    context = browser.new_context(accept_downloads=True)
    page = context.new_page()

    # Separate request/response records make it much easier to reconstruct
    # the exact browser flow later.
    captured_requests = []
    captured_responses = []
    failed_requests = []
    downloads = []

    def on_request(request: Request):
        # Capture all XHR/fetch/document requests. These are the most useful
        # resources for discovering the API even when the URL has no obvious
        # "design" or "download" keyword.
        if request.resource_type not in (
            "xhr",
            "fetch",
            "document",
            "other",
        ):
            return

        entry = {
            "url": request.url,
            "method": request.method,
            "resource_type": request.resource_type,
            "request_headers": safe_headers(request.headers),
            "post_data": safe_post_data(request),
        }

        captured_requests.append(entry)

        if is_interesting_url(request.url):
            print(
                "\n[DesignFiles][request]",
                request.method,
                request.url,
            )

    def on_response(response: Response):
        req = response.request

        # Capture the same useful network classes plus anything whose URL
        # strongly suggests an asset/design/download operation.
        if (
            req.resource_type not in (
                "xhr",
                "fetch",
                "document",
                "other",
            )
            and not is_interesting_url(response.url)
        ):
            return

        content_type = response.headers.get("content-type", "")

        entry = {
            "url": response.url,
            "method": req.method,
            "resource_type": req.resource_type,
            "request_headers": safe_headers(req.headers),
            "post_data": safe_post_data(req),
            "status": response.status,
            "response_headers": safe_headers(response.headers),
            "content_type": content_type,
        }

        body = safe_response_body(response)

        if body.get("skipped"):
            entry["body_skipped_reason"] = body["reason"]
        elif "error" in body:
            entry["body_error"] = body["error"]
        else:
            entry["response_body_json"] = body.get("json")
            entry["response_body_text"] = body.get("text")

        captured_responses.append(entry)

        if is_interesting_url(response.url):
            print(
                "\n[DesignFiles][response]",
                response.status,
                response.url,
                f"content-type={content_type}",
            )

            if entry.get("response_body_json") is not None:
                preview = json.dumps(
                    entry["response_body_json"],
                    indent=2,
                    ensure_ascii=False,
                )[:5000]

                print("  -> JSON body preview:")
                print(preview)

                if len(json.dumps(entry["response_body_json"])) > 5000:
                    print("  ... (truncated preview, full body saved)")

            elif entry.get("body_skipped_reason"):
                print(
                    "  ->",
                    entry["body_skipped_reason"],
                )

    def on_request_failed(request: Request):
        entry = {
            "url": request.url,
            "method": request.method,
            "resource_type": request.resource_type,
            "failure": request.failure,
        }

        failed_requests.append(entry)

        print(
            "\n[DesignFiles][request FAILED]",
            request.method,
            request.url,
            request.failure,
        )

    def on_download(download):
        print(
            "\n[DesignFiles][DOWNLOAD EVENT]",
            f"filename={download.suggested_filename}",
            f"url={download.url}",
        )

        downloads.append(
            {
                "type": "download_event",
                "url": download.url,
                "suggested_filename": download.suggested_filename,
            }
        )

        # Cancel so we don't accidentally download a large CAD package.
        try:
            download.cancel()
        except Exception:
            pass

    page.on("request", on_request)
    page.on("response", on_response)
    page.on("requestfailed", on_request_failed)
    page.on("download", on_download)

    try:
        page.goto(
            PRODUCT_URL,
            wait_until="domcontentloaded",
            timeout=60000,
        )
    except Exception as exc:
        print(f"Navigation warning (continuing anyway): {exc}")

    dismiss_cookie_banner(page)

    # Let the PDP finish its client-side API calls.
    page.wait_for_timeout(5000)

    print("\nPDP loaded. Network capture is active.")

    automated_ok = False

    # -----------------------------------------------------------------------
    # Try the interaction automatically first.
    # If KOHLER's DOM changes or the locator hits a detached element, we
    # immediately fall back to manual interaction.
    # -----------------------------------------------------------------------

    try:
        print("Attempting to locate 'Design Files' section...")

        design_files_locator = page.get_by_text(
            "Design Files",
            exact=False,
        )

        if design_files_locator.count() == 0:
            raise RuntimeError("'Design Files' text not found")

        design_files_locator.first.scroll_into_view_if_needed(timeout=5000)

        try:
            design_files_locator.first.click(timeout=5000)
        except Exception:
            # Some pages expose the section as an accordion/header whose
            # text node itself isn't clickable. Try the nearest common
            # interactive ancestor.
            locator = design_files_locator.first.locator(
                "xpath=ancestor-or-self::*[self::button or @role='button'][1]"
            )

            if locator.count() == 0:
                raise

            locator.first.click(timeout=5000)

        page.wait_for_timeout(1500)

        print("Opened 'Design Files'.")

        print("Looking for OBJ...")

        obj_locator = page.get_by_text(
            re.compile(r"^\s*OBJ\s*$"),
            exact=False,
        )

        if obj_locator.count() == 0:
            raise RuntimeError("OBJ option not found")

        obj_locator.first.scroll_into_view_if_needed(timeout=5000)

        try:
            obj_locator.first.click(timeout=3000)
        except Exception:
            # Try the associated label/input when the text node isn't itself
            # clickable.
            obj_parent = obj_locator.first.locator(
                "xpath=ancestor::label[1]"
            )

            if obj_parent.count() > 0:
                obj_parent.first.click(timeout=3000)
            else:
                raise

        print("Selected OBJ.")
        page.wait_for_timeout(1500)

        print("Looking for Download...")

        download_locator = page.get_by_role(
            "button",
            name=re.compile(r"Download", re.I),
        )

        if download_locator.count() == 0:
            download_locator = page.get_by_text(
                re.compile(r"^\s*Download\s*$", re.I)
            )

        if download_locator.count() == 0:
            raise RuntimeError("Download button not found")

        download_locator.first.scroll_into_view_if_needed(timeout=5000)

        download_locator.first.click(timeout=5000)

        print("Clicked Download.")
        automated_ok = True

    except Exception as exc:
        print("\nAutomatic Design Files flow failed:")
        print(repr(exc))

    # -----------------------------------------------------------------------
    # Manual fallback.
    # This is intentional. You can use the real visible browser to perform
    # the exact interaction while all listeners remain active.
    # -----------------------------------------------------------------------

    if not automated_ok:
        print(
            "\n"
            "============================================================\n"
            "MANUAL DESIGN FILES CAPTURE\n"
            "============================================================\n"
            "The browser is still open and network capture is ACTIVE.\n\n"
            "Please manually do exactly this:\n"
            "  1. Open 'Design Files'\n"
            "  2. Select ONLY the OBJ checkbox\n"
            "  3. Click 'Download'\n"
            "  4. Wait about 10 seconds\n"
            "  5. Return to this terminal\n"
            "  6. Press ENTER\n\n"
            "You can perform the clicks normally. Do not close the browser.\n"
            "============================================================\n"
        )

        input("Press ENTER after the OBJ download attempt... ")

    else:
        # Give asynchronous requests/redirects/downloads time to settle.
        print("\nWaiting for network activity to settle...")
        page.wait_for_timeout(8000)

        print(
            "\nAutomatic flow completed. "
            "If you want to repeat it manually, you can rerun the script."
        )

    # -----------------------------------------------------------------------
    # Save everything.
    # -----------------------------------------------------------------------

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    output = {
        "product_url": PRODUCT_URL,
        "capture_notes": {
            "objective": (
                "Identify the KOHLER Design Files metadata/download mechanism "
                "for SKU 18343T-0."
            ),
            "interaction": (
                "Open Design Files -> select OBJ -> click Download."
            ),
            "binary_response_bodies": (
                "Skipped intentionally; headers and download events are saved."
            ),
            "cookies": (
                "Raw Cookie headers are omitted from saved request/response "
                "headers."
            ),
        },
        "requests": captured_requests,
        "responses": captured_responses,
        "failed_requests": failed_requests,
        "downloads": downloads,
    }

    with open(DESIGN_OUT, "w", encoding="utf-8") as f:
        json.dump(
            output,
            f,
            indent=2,
            ensure_ascii=False,
        )

    print(
        f"\nCaptured {len(captured_requests)} relevant request(s), "
        f"{len(captured_responses)} response(s), "
        f"{len(failed_requests)} failed request(s), "
        f"and {len(downloads)} download event(s)."
    )

    print(f"Saved to: {DESIGN_OUT.resolve()}")

    context.close()
    browser.close()

    return output


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as playwright:
        capture_plp(playwright)
        capture_design_files(playwright)

    print("\n============================================================")
    print("DONE")
    print("============================================================")
    print(f"PLP capture:    {PLP_OUT.resolve()}")
    print(f"Design capture: {DESIGN_OUT.resolve()}")
    print(
        "\nSend me data/_debug/design_files_capture.json after the run "
        "and I can trace the exact Design Files download flow."
    )


if __name__ == "__main__":
    main()