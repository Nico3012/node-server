import { getPrivateHttpRequest } from "./get-private-http-request.js";
import { startHttp2SecureServer, startHttp1SecureServer, startHttp2Server, startHttp1Server } from "./start-http-server.js";
import { handlePrivateHttpRequest } from "./handle-private-http-request.js";

/**
 * @param {{ [authority: string]: string; }} privateHttpProxyServerConfig - { "users.liquipay.de": "127.0.0.1:5000" }
 * @param {(privateHttpConnection: import("./get-private-http-connection.js").PrivateHttpConnection, errorMessage: string, status: number) => unknown} handleErrorPrivateHttpConnection
 * @returns {(request: import("node:http2").Http2ServerRequest | import("node:http").IncomingMessage, response: import("node:http2").Http2ServerResponse | import("node:http").ServerResponse<import("node:http").IncomingMessage> & { req: import("node:http").IncomingMessage; }) => undefined}
 */
const getHandleHttpRequest = (privateHttpProxyServerConfig, handleErrorPrivateHttpConnection) => {
    return (request, response) => {
        const privateHttpRequest = getPrivateHttpRequest(request, response);

        handlePrivateHttpRequest(privateHttpRequest, privateHttpProxyServerConfig, handleErrorPrivateHttpConnection);
    };
};

/**
 * @param {{ [authority: string]: string; }} privateHttpProxyServerConfig - { "users.liquipay.de": "127.0.0.1:5000" }
 * @param {(privateHttpConnection: import("./get-private-http-connection.js").PrivateHttpConnection, errorMessage: string, status: number) => unknown} handleErrorPrivateHttpConnection
 * @param {import("./start-http-server.js").Http2SecureServerOptions} http2SecureServerOptions
 * @returns {undefined}
 */
export const createHttp2SecureServer = (privateHttpProxyServerConfig, handleErrorPrivateHttpConnection, http2SecureServerOptions) => {
    const handleHttpRequest = getHandleHttpRequest(privateHttpProxyServerConfig, handleErrorPrivateHttpConnection);

    startHttp2SecureServer(handleHttpRequest, http2SecureServerOptions);
};

/**
 * @param {{ [authority: string]: string; }} privateHttpProxyServerConfig - { "users.liquipay.de": "127.0.0.1:5000" }
 * @param {(privateHttpConnection: import("./get-private-http-connection.js").PrivateHttpConnection, errorMessage: string, status: number) => unknown} handleErrorPrivateHttpConnection
 * @param {import("./start-http-server.js").Http1SecureServerOptions} http1SecureServerOptions
 * @returns {undefined}
 */
export const createHttp1SecureServer = (privateHttpProxyServerConfig, handleErrorPrivateHttpConnection, http1SecureServerOptions) => {
    const handleHttpRequest = getHandleHttpRequest(privateHttpProxyServerConfig, handleErrorPrivateHttpConnection);

    startHttp1SecureServer(handleHttpRequest, http1SecureServerOptions);
};

/**
 * @param {{ [authority: string]: string; }} privateHttpProxyServerConfig - { "users.liquipay.de": "127.0.0.1:5000" }
 * @param {(privateHttpConnection: import("./get-private-http-connection.js").PrivateHttpConnection, errorMessage: string, status: number) => unknown} handleErrorPrivateHttpConnection
 * @param {import("./start-http-server.js").Http2ServerOptions} http2ServerOptions
 * @returns {undefined}
 */
export const createHttp2Server = (privateHttpProxyServerConfig, handleErrorPrivateHttpConnection, http2ServerOptions) => {
    const handleHttpRequest = getHandleHttpRequest(privateHttpProxyServerConfig, handleErrorPrivateHttpConnection);

    startHttp2Server(handleHttpRequest, http2ServerOptions);
};

/**
 * @param {{ [authority: string]: string; }} privateHttpProxyServerConfig - { "users.liquipay.de": "127.0.0.1:5000" }
 * @param {(privateHttpConnection: import("./get-private-http-connection.js").PrivateHttpConnection, errorMessage: string, status: number) => unknown} handleErrorPrivateHttpConnection
 * @param {import("./start-http-server.js").Http1ServerOptions} http1ServerOptions
 * @returns {undefined}
 */
export const createHttp1Server = (privateHttpProxyServerConfig, handleErrorPrivateHttpConnection, http1ServerOptions) => {
    const handleHttpRequest = getHandleHttpRequest(privateHttpProxyServerConfig, handleErrorPrivateHttpConnection);

    startHttp1Server(handleHttpRequest, http1ServerOptions);
};
