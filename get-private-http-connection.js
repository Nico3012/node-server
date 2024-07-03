import { stat } from "node:fs/promises";
import { createPrivateReadStream } from "./create-private-read-stream.js";

/**
 * @typedef {"text/plain; charset=utf-8" | "text/html; charset=utf-8" | "text/css; charset=utf-8" | "text/javascript; charset=utf-8" | "application/json; charset=utf-8" | "application/manifest+json; charset=utf-8" | "application/wasm" | "image/png" | "video/mp4" | "application/octet-stream"} ContentType
 */

/**
 * @typedef {"no-cache" | "max-age=31536000, immutable"} CacheControl
 */

/**
 * @typedef SendFileOptions
 * @property {string} joinedAbsolutePathname
 * @property {number} [status]
 * @property {ContentType} [contentType]
 * @property {CacheControl} [cacheControl]
 * @property {{ [key: string]: string; }} [cookie]
 */

/**
 * @typedef SendDataOptions
 * @property {string | Buffer} data
 * @property {number} [status]
 * @property {ContentType} [contentType]
 * @property {CacheControl} [cacheControl]
 * @property {{ [key: string]: string; }} [cookie]
 */

/**
 * @typedef SendHrefOptions
 * @property {string} href
 * @property {number} [status]
 * @property {{ [key: string]: string; }} [cookie]
 */

/**
 * @typedef PrivateHttpConnection
 * @property {string} method
 * @property {string} pathname
 * @property {string} search
 * @property {{ [key: string]: string }} searchParams
 * @property {{ [key: string]: string }} cookie
 * @property {Promise<string>} body
 * @property {import("node:http").IncomingHttpHeaders | import("node:http2").IncomingHttpHeaders} headers
 * @property {(sendFileOptions: SendFileOptions) => Promise<"success" | "failed-no-further-action" | "failed-directory" | "failed-unknown-stats" | "failed-stats-not-found">} sendFile
 * @property {(sendDataOptions: SendDataOptions) => "success" | "failed-no-further-action"} sendData
 * @property {(sendHrefOptions: SendHrefOptions) => "success" | "failed-no-further-action"} sendHref
 */

/**
 * @param {string} pathname
 * @returns {ContentType}
 */
const getContentType = (pathname) => {
    if (pathname.endsWith(".txt")) return "text/plain; charset=utf-8";
    if (pathname.endsWith(".html")) return "text/html; charset=utf-8";
    if (pathname.endsWith(".css")) return "text/css; charset=utf-8";
    if (pathname.endsWith(".js")) return "text/javascript; charset=utf-8";
    if (pathname.endsWith(".json")) return "application/json; charset=utf-8";
    if (pathname.endsWith(".webmanifest")) return "application/manifest+json; charset=utf-8";
    if (pathname.endsWith(".wasm")) return "application/wasm";
    if (pathname.endsWith(".png")) return "image/png";
    if (pathname.endsWith(".mp4")) return "video/mp4";
    return "application/octet-stream";
};

/**
 * @param {string} pathname
 * @returns {CacheControl}
 */
const getCacheControl = (pathname) => {
    if (pathname.endsWith(".txt")) return "no-cache";
    if (pathname.endsWith(".html")) return "no-cache";
    if (pathname.endsWith(".css")) return "max-age=31536000, immutable";
    if (pathname.endsWith(".js")) return "max-age=31536000, immutable";
    if (pathname.endsWith(".json")) return "max-age=31536000, immutable";
    if (pathname.endsWith(".webmanifest")) return "max-age=31536000, immutable";
    if (pathname.endsWith(".wasm")) return "max-age=31536000, immutable";
    if (pathname.endsWith(".png")) return "max-age=31536000, immutable";
    if (pathname.endsWith(".mp4")) return "max-age=31536000, immutable";
    return "no-cache";
};

/**
 * @param {import("./create-private-read-stream.js").PrivateReadStream} privateReadStream
 * @param {import("./get-private-http-request.js").PrivateHttpRequest} privateHttpRequest
 * @returns {Promise<"success" | "failed-no-further-action" | "failed-headers-not-sent">}
 */
const pipePrivateStreamRequest = (privateReadStream, privateHttpRequest) => {
    return new Promise((resolve) => {
        let resolved = false;

        privateReadStream.onData((chunk) => {
            if (resolved === false) {
                const writeResponseStatus = privateHttpRequest.writeResponse(chunk);

                if (writeResponseStatus === "failed-writable-ended") {
                    resolve("failed-no-further-action");
                    resolved = true;
                }

                if (writeResponseStatus === "failed-headers-not-sent") {
                    resolve("failed-headers-not-sent");
                    resolved = true;
                }

                if (writeResponseStatus === "success-drain") {
                    privateReadStream.pause();

                    // failed is not possible because it was checked before in writeResponse
                    privateHttpRequest.onceResponseDrain(() => {
                        privateReadStream.resume();
                    });
                }
            }
        });

        privateReadStream.onEnd(() => {
            if (resolved === false) {
                const endResponseStatus = privateHttpRequest.endResponse();

                if (endResponseStatus === "failed-writable-ended") {
                    resolve("failed-no-further-action");
                    resolved = true;
                }

                if (endResponseStatus === "failed-headers-not-sent") {
                    resolve("failed-headers-not-sent");
                    resolved = true;
                }

                if (endResponseStatus === "success") {
                    resolve("success");
                    resolved = true;
                }
            }
        });

        // It is highly unlikely that privateReadStream will fail. This case is not taken into account.
    });
};

/**
 * @param {import("./get-private-http-request.js").PrivateHttpRequest} privateHttpRequest
 * @returns {PrivateHttpConnection}
 */
export const getPrivateHttpConnection = (privateHttpRequest) => {
    ///////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////

    const method = privateHttpRequest.method || "GET";

    /** @type {[ string, string ]} */ // @ts-ignore
    const [pathname, search = ""] = (privateHttpRequest.url || "/").split(/(?=\?)/, 2);

    /** @type {{[key: string]: string}} */
    const searchParams = Object.fromEntries(new URLSearchParams(search));

    /** @type {{[key: string]: string}} */
    const cookie = Object.fromEntries((privateHttpRequest.headers.cookie || "").split("; ").filter((keyValue) => {
        return keyValue.includes("=");
    }).map((keyValue) => {
        return keyValue.split("=", 2);
    }));

    /** @type {Promise<string>} */
    const body = new Promise((resolve) => {
        let data = "";

        privateHttpRequest.setRequestEncoding("utf-8");

        privateHttpRequest.onRequestData((chunk) => {
            if (typeof chunk === "string") {
                data += chunk;
            }
        });

        privateHttpRequest.onRequestEnd(() => {
            resolve(data);
        });

        setTimeout(() => {
            resolve(data);
        }, 20_000);
    });

    ///////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////

    /**
     * @param {SendFileOptions} sendFileOptions
     * @returns {Promise<"success" | "failed-no-further-action" | "failed-directory" | "failed-unknown-stats" | "failed-stats-not-found">}
     */
    const sendFile = async (sendFileOptions) => {
        try {
            const stats = await stat(sendFileOptions.joinedAbsolutePathname);

            if (stats.isFile()) {
                ///////////////////////////////////////////////////////////////
                ///////////////////////////////////////////////////////////////

                let status = sendFileOptions.status;
                let contentType = sendFileOptions.contentType;
                let cacheControl = sendFileOptions.cacheControl;

                if (contentType === undefined) {
                    contentType = getContentType(sendFileOptions.joinedAbsolutePathname);
                }

                if (cacheControl === undefined) {
                    cacheControl = getCacheControl(sendFileOptions.joinedAbsolutePathname);
                }

                /** @type {{ [header: string]: string | string[] | undefined; }} */
                const headers = {
                    "x-content-type-options": "nosniff",
                    "cache-control": cacheControl,
                    "content-type": contentType
                };

                if (sendFileOptions.cookie !== undefined) {
                    headers["set-cookie"] = Object.entries(sendFileOptions.cookie).map((keyValue) => {
                        return keyValue.join("=");
                    });
                }

                if (privateHttpRequest.headers.range !== undefined && privateHttpRequest.headers.range.startsWith("bytes=")) {
                    if (status === undefined) {
                        status = 206;
                    }

                    const startEnd = privateHttpRequest.headers.range.substring(6).split("-", 2);

                    /** @type {number} */
                    let start;
                    /** @type {number} */
                    let end;

                    if (startEnd[0] !== undefined) {
                        start = parseInt(startEnd[0]);

                        if (isNaN(start)) {
                            start = 0;
                        }
                    } else {
                        start = 0;
                    }

                    if (startEnd[1] !== undefined) {
                        end = parseInt(startEnd[1]);

                        if (isNaN(end)) {
                            end = 0;
                        }
                    } else {
                        end = 0;
                    }

                    if (end === 0) {
                        end = Math.min(start + 10 ** 6, stats.size - 1);
                    }

                    const length = end - start + 1;

                    headers["content-range"] = `bytes ${start}-${end}/${stats.size}`;
                    headers["content-length"] = length.toFixed(0);
                    headers["accept-ranges"] = "bytes";

                    const writeResponseHeadStatus = privateHttpRequest.writeResponseHead(status, headers);

                    if (writeResponseHeadStatus === "failed-writable-ended") {
                        return "failed-no-further-action";
                    }

                    // headers are sent now

                    const privateReadStream = createPrivateReadStream(sendFileOptions.joinedAbsolutePathname, start, end);

                    // pipePrivateStreamRequestStatus cannot be "failed-headers-not-sent" because headers are definentally sent above
                    const pipePrivateStreamRequestStatus = await pipePrivateStreamRequest(privateReadStream, privateHttpRequest);

                    if (pipePrivateStreamRequestStatus === "success") {
                        return "success";
                    }

                    return "failed-no-further-action";
                } else {
                    if (status === undefined) {
                        status = 200;
                    }

                    const writeResponseHeadStatus = privateHttpRequest.writeResponseHead(status, headers);

                    if (writeResponseHeadStatus === "failed-writable-ended") {
                        return "failed-no-further-action";
                    }

                    // headers are sent now

                    const privateReadStream = createPrivateReadStream(sendFileOptions.joinedAbsolutePathname);

                    // pipePrivateStreamRequestStatus cannot be "failed-headers-not-sent" because headers are definentally sent above
                    const pipePrivateStreamRequestStatus = await pipePrivateStreamRequest(privateReadStream, privateHttpRequest);

                    if (pipePrivateStreamRequestStatus === "success") {
                        return "success";
                    }

                    return "failed-no-further-action";
                }

                ///////////////////////////////////////////////////////////////
                ///////////////////////////////////////////////////////////////
            } else if (stats.isDirectory()) {
                return "failed-directory";
            } else {
                return "failed-unknown-stats";
            }
        } catch {
            return "failed-stats-not-found";
        }
    };

    /**
     * @param {SendDataOptions} sendDataOptions
     * @returns {"success" | "failed-no-further-action"}
     */
    const sendData = (sendDataOptions) => {
        const writeResponseHeadStatus = privateHttpRequest.writeResponseHead(sendDataOptions.status || 200, {
            "Content-Type": sendDataOptions.contentType || "text/plain; charset=utf-8",
            "Cache-Control": sendDataOptions.cacheControl || "no-cache",
            "X-Content-Type-Options": "nosniff",
            ...(sendDataOptions.cookie && {
                "Set-Cookie": Object.entries(sendDataOptions.cookie).map((keyValueArray) => {
                    return keyValueArray.join("=");
                })
            })
        });

        if (writeResponseHeadStatus === "failed-writable-ended") {
            return "failed-no-further-action";
        }

        const writeResponseStatus = privateHttpRequest.writeResponse(sendDataOptions.data);

        if (writeResponseStatus === "failed-writable-ended") {
            return "failed-no-further-action";
        }

        const endResponseStatus = privateHttpRequest.endResponse();

        if (endResponseStatus === "failed-writable-ended") {
            return "failed-no-further-action";
        }

        return "success";
    };

    /**
     * @param {SendHrefOptions} sendHrefOptions
     * @returns {"success" | "failed-no-further-action"}
     */
    const sendHref = (sendHrefOptions) => {
        const writeResponseHeadStatus = privateHttpRequest.writeResponseHead(sendHrefOptions.status || 307, {
            Location: sendHrefOptions.href,
            ...(sendHrefOptions.cookie && {
                "Set-Cookie": Object.entries(sendHrefOptions.cookie).map((keyValueArray) => {
                    return keyValueArray.join("=");
                })
            })
        });

        if (writeResponseHeadStatus === "failed-writable-ended") {
            return "failed-no-further-action";
        }

        const endResponseStatus = privateHttpRequest.endResponse();

        if (endResponseStatus === "failed-writable-ended") {
            return "failed-no-further-action";
        }

        return "success";
    };

    ///////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////

    return {
        method: method,
        pathname: pathname,
        search: search,
        searchParams: searchParams,
        cookie: cookie,
        body: body,
        headers: privateHttpRequest.headers,
        sendFile: sendFile,
        sendData: sendData,
        sendHref: sendHref
    };

    ///////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////
};
