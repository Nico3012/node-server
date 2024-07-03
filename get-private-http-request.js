/**
 * @typedef PrivateHttpRequest
 * @property {string | undefined} url
 * @property {string | undefined} method
 * @property {string | undefined} authority
 * @property {import("node:http").IncomingHttpHeaders | import("node:http2").IncomingHttpHeaders} headers

 * @property {(encoding: "utf-8") => "success" | "failed-readable-ended"} setRequestEncoding
 * @property {() => "success" | "failed-readable-ended" | "failed-paused"} pauseRequest
 * @property {() => "success" | "failed-readable-ended" | "failed-not-paused"} resumeRequest
 * @property {(callback: (chunk: string | Buffer) => undefined) => "success" | "failed-readable-ended"} onRequestData
 * @property {(callback: () => undefined) => "success" | "failed-readable-ended"} onRequestEnd

 * @property {(status: number, headers: { [header: string]: string | string[] | undefined; }) => "success" | "failed-writable-ended" | "failed-headers-sent"} writeResponseHead
 * @property {(data: string | Buffer) => "success" | "success-drain" | "failed-writable-ended" | "failed-headers-not-sent"} writeResponse
 * @property {() => "success" | "failed-writable-ended" | "failed-headers-not-sent"} endResponse
 * @property {(callback: () => undefined) => "success" | "failed-writable-ended" | "failed-headers-not-sent"} onceResponseDrain
 */

/**
 * @param {import("node:http2").Http2ServerRequest | import("node:http").IncomingMessage} request
 * @param {import("node:http2").Http2ServerResponse | import("node:http").ServerResponse<import("node:http").IncomingMessage> & { req: import("node:http").IncomingMessage; }} response
 * @returns {PrivateHttpRequest}
 */
export const getPrivateHttpRequest = (request, response) => {
    ///////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////

    const url = request.url;
    const method = request.method;
    const authority = "authority" in request ? request.authority.split(":", 1)[0] : request.headers.host?.split(":", 1)[0];

    /** @type {import("node:http").IncomingHttpHeaders | import("node:http2").IncomingHttpHeaders} */
    const headers = Object.fromEntries(Object.entries(request.headers).filter(([header]) => {
        if (header.startsWith(":")) return false;
        if (header === "connection") return false;
        if (header === "host") return false;

        return true;
    }));

    ///////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////

    /**
     * @param {"utf-8"} encoding
     * @returns {"success" | "failed-readable-ended"}
     */
    const setRequestEncoding = (encoding) => {
        if (request.readableEnded === true) {
            return "failed-readable-ended";
        }

        request.setEncoding(encoding);

        return "success";
    };

    /**
     * @returns {"success" | "failed-readable-ended" | "failed-paused"}
     */
    const pauseRequest = () => {
        if (request.readableEnded === true) {
            return "failed-readable-ended";
        }

        if (request.isPaused() === true) {
            return "failed-paused";
        }

        request.pause();

        return "success";
    };

    /**
     * @returns {"success" | "failed-readable-ended" | "failed-not-paused"}
     */
    const resumeRequest = () => {
        if (request.readableEnded === true) {
            return "failed-readable-ended";
        }

        if (request.isPaused() === false) {
            return "failed-not-paused";
        }

        request.resume();

        return "success";
    };

    /**
     * @param {(chunk: string | Buffer) => undefined} callback
     * @returns {"success" | "failed-readable-ended"}
     */
    const onRequestData = (callback) => {
        if (request.readableEnded === true) {
            return "failed-readable-ended";
        }

        request.on("data", callback);

        return "success";
    };

    /**
     * @param {() => undefined} callback
     * @returns {"success" | "failed-readable-ended"}
     */
    const onRequestEnd = (callback) => {
        if (request.readableEnded === true) {
            return "failed-readable-ended";
        }

        request.on("end", callback);

        return "success";
    };

    ///////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////

    /**
     * @param {number} status
     * @param {{ [header: string]: string | string[] | undefined; }} headers
     * @returns {"success" | "failed-writable-ended" | "failed-headers-sent"}
     */
    const writeResponseHead = (status, headers) => {
        if (response.writableEnded === true) {
            return "failed-writable-ended";
        }

        if (response.headersSent === true) {
            return "failed-headers-sent";
        }

        response.writeHead(status, headers);

        return "success";
    };

    /**
     * @param {string | Buffer} data
     * @returns {"success" | "success-drain" | "failed-writable-ended" | "failed-headers-not-sent"}
     */
    const writeResponse = (data) => {
        if (response.writableEnded === true) {
            return "failed-writable-ended";
        }

        if (response.headersSent === false) {
            return "failed-headers-not-sent";
        }

        if (typeof data === "string") {
            /* validated by node docs */ // @ts-ignore
            const status = response.write(data, "utf-8");

            if (status === true) {
                return "success";
            } else {
                return "success-drain";
            }
        } else {
            /* validated by node docs */ // @ts-ignore
            const status = response.write(data);

            if (status === true) {
                return "success";
            } else {
                return "success-drain";
            }
        }
    };

    /**
     * @returns {"success" | "failed-writable-ended" | "failed-headers-not-sent"}
     */
    const endResponse = () => {
        if (response.writableEnded === true) {
            return "failed-writable-ended";
        }

        if (response.headersSent === false) {
            return "failed-headers-not-sent";
        }

        response.end();

        return "success";
    };

    /**
     * @param {() => undefined} callback
     * @returns {"success" | "failed-writable-ended" | "failed-headers-not-sent"}
     */
    const onceResponseDrain = (callback) => {
        if (response.writableEnded === true) {
            return "failed-writable-ended";
        }

        if (response.headersSent === false) {
            return "failed-headers-not-sent";
        }

        response.once("drain", callback);

        return "success";
    };

    ///////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////

    return {
        url: url,
        method: method,
        authority: authority,
        headers: headers,

        setRequestEncoding: setRequestEncoding,
        pauseRequest: pauseRequest,
        resumeRequest: resumeRequest,
        onRequestData: onRequestData,
        onRequestEnd: onRequestEnd,

        writeResponseHead: writeResponseHead,
        writeResponse: writeResponse,
        endResponse: endResponse,
        onceResponseDrain: onceResponseDrain
    };

    ///////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////
};
