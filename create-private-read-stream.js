import { createReadStream } from "fs";

/**
 * @typedef PrivateReadStream
 * @property {(encoding: "utf-8") => "success" | "failed-readable-ended"} setEncoding
 * @property {() => "success" | "failed-readable-ended" | "failed-paused"} pause
 * @property {() => "success" | "failed-readable-ended" | "failed-not-paused"} resume
 * @property {(callback: (chunk: string | Buffer) => undefined) => "success" | "failed-readable-ended"} onData
 * @property {(callback: () => undefined) => "success" | "failed-readable-ended"} onEnd
 */

/**
 * @param {string} joinedAbsolutePathname
 * @param {number} [start]
 * @param {number} [end]
 * @returns {PrivateReadStream}
 */
export const createPrivateReadStream = (joinedAbsolutePathname, start, end) => {
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /** @type {import("node:fs").ReadStream} */
    let readStream;

    if (start === undefined || end === undefined) {
        readStream = createReadStream(joinedAbsolutePathname);
    } else {
        readStream = createReadStream(joinedAbsolutePathname, {
            start: start,
            end: end
        });
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @param {"utf-8"} encoding
     * @returns {"success" | "failed-readable-ended"}
     */
    const setEncoding = (encoding) => {
        if (readStream.readableEnded === true) {
            return "failed-readable-ended";
        }

        readStream.setEncoding(encoding);

        return "success";
    };

    /**
     * @returns {"success" | "failed-readable-ended" | "failed-paused"}
     */
    const pause = () => {
        if (readStream.readableEnded === true) {
            return "failed-readable-ended";
        }

        if (readStream.isPaused() === true) {
            return "failed-paused";
        }

        readStream.pause();

        return "success";
    };

    /**
     * @returns {"success" | "failed-readable-ended" | "failed-not-paused"}
     */
    const resume = () => {
        if (readStream.readableEnded === true) {
            return "failed-readable-ended";
        }

        if (readStream.isPaused() === false) {
            return "failed-not-paused";
        }

        readStream.resume();

        return "success";
    };

    /**
     * @param {(chunk: string | Buffer) => undefined} callback
     * @returns {"success" | "failed-readable-ended"}
     */
    const onData = (callback) => {
        if (readStream.readableEnded === true) {
            return "failed-readable-ended";
        }

        readStream.on("data", callback);

        return "success";
    };

    /**
     * @param {() => undefined} callback
     * @returns {"success" | "failed-readable-ended"}
     */
    const onEnd = (callback) => {
        if (readStream.readableEnded === true) {
            return "failed-readable-ended";
        }

        readStream.on("end", callback);

        return "success";
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

    return {
        setEncoding: setEncoding,
        pause: pause,
        resume: resume,
        onData: onData,
        onEnd: onEnd
    };

    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
};
