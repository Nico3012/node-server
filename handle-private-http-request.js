import { getPrivateHttpConnection } from "./get-private-http-connection.js";
import { connect } from "node:http2";

/**
 * @param {import("./get-private-http-request.js").PrivateHttpRequest} privateHttpRequest
 * @param {{ [authority: string]: string; }} privateHttp2SecureProxyServerConfig - { "users.liquipay.de": "127.0.0.1:5000" }
 * @param {(privateHttpConnection: import("./get-private-http-connection.js").PrivateHttpConnection, errorMessage: string, status: number) => unknown} handleErrorPrivateHttpConnection
 * @returns {undefined}
 */
export const handlePrivateHttpRequest = (privateHttpRequest, privateHttp2SecureProxyServerConfig, handleErrorPrivateHttpConnection) => {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    let handledErrorPrivateHttpRequest = false;

    /**
     * @param {string} errorMessage
     * @param {number} status
     * @returns {undefined}
     */
    const handleErrorPrivateHttpRequest = (errorMessage, status) => {
        if (handledErrorPrivateHttpRequest === false) {
            const privateHttpConnection = getPrivateHttpConnection(privateHttpRequest);

            handleErrorPrivateHttpConnection(privateHttpConnection, errorMessage, status);

            handledErrorPrivateHttpRequest = true;
        }
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    if (privateHttpRequest.authority === undefined) {
        return handleErrorPrivateHttpRequest("authority is undefined", 400);
    }

    const authority = privateHttp2SecureProxyServerConfig[privateHttpRequest.authority];

    if (authority === undefined) {
        return handleErrorPrivateHttpRequest("cannot find authority in config", 400);
    }

    const client = connect(`http://${authority}`);

    client.on("error", /** @param {Error} error */(error) => {
        console.log(`error connecting to http://${authority}: ${error.message}`);
    });

    if (client.closed === true) {
        if (client.destroyed === false) {
            client.destroy();
        }

        return handleErrorPrivateHttpRequest("client got immediately closed", 500);
    }

    const request = client.request({
        ":path": privateHttpRequest.url,
        ":method": privateHttpRequest.method,
        ...privateHttpRequest.headers
    });

    if (request.closed === true) {
        if (client.destroyed === false) {
            client.destroy();
        }

        return handleErrorPrivateHttpRequest("request got immediately closed", 500);
    }

    privateHttpRequest.onRequestData((chunk) => {
        if (request.destroyed === true) {
            if (client.destroyed === false) {
                client.destroy();
            }

            return handleErrorPrivateHttpRequest("request got destroyed", 500);
        }

        const writeStatus = request.write(chunk);

        if (writeStatus === false) {
            const pauseRequestStatus = privateHttpRequest.pauseRequest();

            if (pauseRequestStatus === "failed-readable-ended") {
                if (client.destroyed === false) {
                    client.destroy();
                }

                return;
            }

            request.once("drain", () => {
                const resumeRequestStatus = privateHttpRequest.resumeRequest();

                if (resumeRequestStatus === "failed-readable-ended") {
                    if (client.destroyed === false) {
                        client.destroy();
                    }

                    return;
                }
            });
        }
    });

    const onRequestEndStatus = privateHttpRequest.onRequestEnd(() => {
        if (request.destroyed === true) {
            if (client.destroyed === false) {
                client.destroy();
            }

            return handleErrorPrivateHttpRequest("request got destroyed", 500);
        }

        request.end();
    });

    if (onRequestEndStatus === "failed-readable-ended") {
        if (client.destroyed === false) {
            client.destroy();
        }

        return;
    }

    request.on("response", (headers) => {
        const status = headers[":status"];

        if (status === undefined) {
            if (client.destroyed === false) {
                client.destroy();
            }

            return handleErrorPrivateHttpRequest("cannot find status in headers", 500);
        }

        /** @type {{ [header: string]: string | string[] | undefined; }} */
        const outgoingHttpHeaders = Object.fromEntries(Object.entries(headers).filter((headerArray) => {
            return headerArray[0].startsWith(":") === false;
        }).map((headerArray) => {
            /** @type {string} */ // @ts-ignore // headerArray[0] must be a string
            const headerName = headerArray.shift();

            return [
                headerName.split("-").map((part) => {
                    return (part[0]?.toUpperCase() || "") + part.substring(1);
                }).join("-"),
                ...headerArray
            ];
        }));

        const writeResponseHeadStatus = privateHttpRequest.writeResponseHead(status, outgoingHttpHeaders);

        if (writeResponseHeadStatus === "failed-writable-ended") {
            if (client.destroyed === false) {
                client.destroy();
            }

            return;
        }
    });

    request.on("data", /** @param {string | Buffer} chunk */(chunk) => {
        const writeResponseStatus = privateHttpRequest.writeResponse(chunk);

        if (writeResponseStatus === "failed-writable-ended") {
            if (client.destroyed === false) {
                client.destroy();
            }

            return;
        }

        if (writeResponseStatus === "failed-headers-not-sent") {
            if (client.destroyed === false) {
                client.destroy();
            }

            return handleErrorPrivateHttpRequest("cannot write response because headers were not sent", 500);
        }

        if (writeResponseStatus === "success-drain") {
            request.pause();

            privateHttpRequest.onceResponseDrain(() => {
                if (request.destroyed === true) {
                    if (client.destroyed === false) {
                        client.destroy();
                    }

                    return handleErrorPrivateHttpRequest("request got destroyed on response drain", 500);
                }

                request.resume();
            });
        }
    });

    request.on("end", () => {
        const endResponseStatus = privateHttpRequest.endResponse();

        if (client.destroyed === false) {
            client.destroy();
        }

        if (endResponseStatus === "failed-headers-not-sent") {
            return handleErrorPrivateHttpRequest("cannot end response because headers were not sent", 500);
        }
    });

    request.on("error", /** @param {Error} error */(error) => {
        if (client.destroyed === false) {
            client.destroy();
        }

        return handleErrorPrivateHttpRequest(error.message, 500);
    });

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
};
