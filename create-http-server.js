import { getPrivateHttpRequest } from "./get-private-http-request.js";
import { getPrivateHttpConnection } from "./get-private-http-connection.js";
import { startHttp2SecureServer, startHttp1SecureServer, startHttp2Server, startHttp1Server } from "./start-http-server.js";

/**
 * @param {(privateHttpConnection: import("./get-private-http-connection.js").PrivateHttpConnection) => unknown} handlePrivateHttpConnection
 * @returns {(request: import("node:http2").Http2ServerRequest | import("node:http").IncomingMessage, response: import("node:http2").Http2ServerResponse | import("node:http").ServerResponse<import("node:http").IncomingMessage> & { req: import("node:http").IncomingMessage; }) => undefined}
 */
const getHandleHttpRequest = (handlePrivateHttpConnection) => {
    return (request, response) => {
        const privateHttpRequest = getPrivateHttpRequest(request, response);
        const privateHttpConnection = getPrivateHttpConnection(privateHttpRequest);

        handlePrivateHttpConnection(privateHttpConnection);
    };
};

/**
 * @param {(privateHttpConnection: import("./get-private-http-connection.js").PrivateHttpConnection) => unknown} handlePrivateHttpConnection
 * @param {import("./start-http-server.js").Http2SecureServerOptions} http2SecureServerOptions
 * @returns {undefined}
 */
export const createHttp2SecureServer = (handlePrivateHttpConnection, http2SecureServerOptions) => {
    const handleHttpRequest = getHandleHttpRequest(handlePrivateHttpConnection);

    startHttp2SecureServer(handleHttpRequest, http2SecureServerOptions);
};

/**
 * @param {(privateHttpConnection: import("./get-private-http-connection.js").PrivateHttpConnection) => unknown} handlePrivateHttpConnection
 * @param {import("./start-http-server.js").Http1SecureServerOptions} http1SecureServerOptions
 * @returns {undefined}
 */
export const createHttp1SecureServer = (handlePrivateHttpConnection, http1SecureServerOptions) => {
    const handleHttpRequest = getHandleHttpRequest(handlePrivateHttpConnection);

    startHttp1SecureServer(handleHttpRequest, http1SecureServerOptions);
};

/**
 * @param {(privateHttpConnection: import("./get-private-http-connection.js").PrivateHttpConnection) => unknown} handlePrivateHttpConnection
 * @param {import("./start-http-server.js").Http2ServerOptions} http2ServerOptions
 * @returns {undefined}
 */
export const createHttp2Server = (handlePrivateHttpConnection, http2ServerOptions) => {
    const handleHttpRequest = getHandleHttpRequest(handlePrivateHttpConnection);

    startHttp2Server(handleHttpRequest, http2ServerOptions);
};

/**
 * @param {(privateHttpConnection: import("./get-private-http-connection.js").PrivateHttpConnection) => unknown} handlePrivateHttpConnection
 * @param {import("./start-http-server.js").Http1ServerOptions} http1ServerOptions
 * @returns {undefined}
 */
export const createHttp1Server = (handlePrivateHttpConnection, http1ServerOptions) => {
    const handleHttpRequest = getHandleHttpRequest(handlePrivateHttpConnection);

    startHttp1Server(handleHttpRequest, http1ServerOptions);
};
