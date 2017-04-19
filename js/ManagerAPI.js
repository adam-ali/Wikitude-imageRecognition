/**
 * TargetsAPI shows a simple example how to interact with the Wikitude Cloud Targets API.
 *
 * This example is published under Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0.html
 *
 * @author Wikitude
 *
 */

"use strict";
var https = require('https');

class APIError extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }

    toString() {
        return `(${this.code}): ${this.message}`;
    }
}

class ServiceError extends APIError {
    constructor(message, code, reason) {
        super(message, code);
        this.reason = reason;
    }

    toString() {
        return `${this.reason} (${this.code}): ${this.message}`;
    }
}

// The endpoint where the Wikitude Cloud Targets API resides.
var API_ENDPOINT_ROOT       = "api.wikitude.com";

// placeholders used for url-generation
var PLACEHOLDER_TC_ID       = "${TC_ID}";
var PLACEHOLDER_TARGET_ID   = "${TARGET_ID}";

// paths used for manipulation of target collection and target images
var PATH_ADD_TC      = "/cloudrecognition/targetCollection";
var PATH_GET_TC      = "/cloudrecognition/targetCollection/" + PLACEHOLDER_TC_ID;
var PATH_GENERATE_TC = "/cloudrecognition/targetCollection/" + PLACEHOLDER_TC_ID + "/generation/cloudarchive";

var PATH_ADD_TARGET  = "/cloudrecognition/targetCollection/" + PLACEHOLDER_TC_ID + "/target";
var PATH_ADD_TARGETS = "/cloudrecognition/targetCollection/" + PLACEHOLDER_TC_ID + "/targets";
var PATH_GET_TARGET  = "/cloudrecognition/targetCollection/" + PLACEHOLDER_TC_ID + "/target/" + PLACEHOLDER_TARGET_ID;

// status codes as returned by the api
var HTTP_OK         = 200;
var HTTP_ACCEPTED   = 202;
var HTTP_NO_CONTENT = 204;

var HEADER_LOCATION = "location";
var CONTENT_TYPE_JSON = "application/json";

// Your API key
var apiToken = null;
// The version of the API we will use
var apiVersion = null;
// interval used to poll status of asynchronous operations
var apiPollInterval = null;

/**
 * @class ManagerAPI
 */
module.exports = class ManagerAPI {
    /**
     * Creates a new ManagerAPI object that offers the service to interact with the Wikitude Cloud Targets API.
     *
     * @param {string} token The token to use when connecting to the endpoint
     * @param {number} version The version of the API we will use
     * @param {number} [pollInterval=10000] in milliseconds used to poll status of asynchronous operations
     */
    constructor(token, version, pollInterval) {
        // save the configured values
        apiToken = token;
        apiVersion = version;
        apiPollInterval = pollInterval || 10000;
    }

    /**
     * Create target collection with given name. Note: response contains unique "id" attribute, which is required for any further modifications
     * @param name of the target collection
     * @returns {Promise}
     *      resolved once target collection was added, value is JSON Object of the created empty target collection
     */
    createTargetCollection(name) {
        var path = PATH_ADD_TC;
        var payload = {name};

        return sendRequest('POST', path, payload);
    }

    /**
     * Retrieve all created and active target collections
     * @returns {Promise}
     *      resolved once target collections' information is available, result is JSONArray of target collection JSONObjects
     */
    getAllTargetCollections() {
        return sendRequest('GET', PATH_ADD_TC);
    }

    /**
     * Rename existing target collection
     * @param {string} tcId id of target collection
     * @param {string} name new name to use for this target collection
     * @returns {Promise}
     *      resolved once target collection was updated, result is JSON Object of the modified  target collection
     */
    renameTargetCollection(tcId, name) {
        var path = PATH_GET_TC.replace(PLACEHOLDER_TC_ID, tcId);
        var payload = {name};

        return sendRequest('POST', path, payload);
    }

    /**
     * Receive target collection as JSON Object (without making any modifications)
     * @param {string} tcId id of the target collection
     * @returns {Promise}
     *      resolved once target collection is available, result is JSON Object of target collection
     */
    getTargetCollection(tcId) {
        var path = PATH_GET_TC.replace(PLACEHOLDER_TC_ID, tcId);

        return sendRequest('GET', path);
    }

    /**
     * Deletes given target collection including all of its target images. Note: this cannot be undone.
     * @param {string} tcId id of target collection
     * @returns {Promise}
     *      resolved once target collection was deleted
     */
    deleteTargetCollection(tcId) {
        var path = PATH_GET_TC.replace(PLACEHOLDER_TC_ID, tcId);

        return sendRequest('DELETE', path);
    }

    /**
     * retrieve all targets from a target collection by id (NOT name)
     * @param {string} tcId id of target collection
     * @returns {Promise}
     *      resolved once targets are available, result is Array of all targets of requested target collection
     */
    getAllTargets(tcId) {
        var path = PATH_ADD_TARGET.replace(PLACEHOLDER_TC_ID, tcId);

        return sendRequest('GET', path);
    }

    /**
     * adds a target to an existing target collection. Note: You have to call generateTargetCollection to take changes into account
     * @param {string} tcId id of the target collection to add target to
     * @param target JSONObject of targetImages. Must contain 'name' and 'imageUrl' attribute
     * @returns {Promise}
     *      resolved once target image was added, result is JSONObject of target ('id' is unique targetId)
     */
    addTarget(tcId, target) {
        var path = PATH_ADD_TARGET.replace(PLACEHOLDER_TC_ID, tcId);

        return sendRequest('POST', path, target);
    }

    /**
     * Adds targets to existing target collection. Note: You have to call generateTargetCollection to take changes into account
     * @param {string} tcId id of target collection
     * @param targets Array of JSONObjects of targetImages. Must contain 'name' and 'imageUrl' attribute
     * @returns {Promise} JSON representation of the status of the operation
     *      resolved once the operation finished, for the result the service will be polled
     *      Note: Depending on the amount of targets this operation may take from seconds to minutes
     */
    addTargets(tcId, targets) {
        var path = PATH_ADD_TARGETS.replace(PLACEHOLDER_TC_ID, tcId);

        return sendAsyncRequest('POST', path, targets);
    }

    /**
     * Receive existing target image's information
     * @param {string} tcId id of target collection
     * @param {string} targetId id of target
     * @returns {Promise}
     *      resolved once target image was added, result is JSONObject of target collection
     */
    getTarget(tcId, targetId) {
        var path = PATH_GET_TARGET.replace(PLACEHOLDER_TC_ID, tcId).replace(PLACEHOLDER_TARGET_ID, targetId);

        return sendRequest('GET', path);
    }

    /**
     * Update target JSON properties of existing targetId and targetCollectionId
     * @param {string} tcId id of target collection
     * @param {string} targetId id of target
     * @param {Object} target JSON representation of the target's properties that shall be updated, e.g. { "physicalHeight": 200 }
     * @returns {Promise}
     *      resolved once the target was updated, result is a JSON representation of the target as an array
     */
    updateTarget(tcId, targetId, target) {
        var path = PATH_GET_TARGET.replace(PLACEHOLDER_TC_ID, tcId).replace(PLACEHOLDER_TARGET_ID, targetId);

        return sendRequest('POST', path, target);
    }

    /**
     * Deletes existing target from a target collection
     * @param {string} tcId id of target collection
     * @param {string} targetId id of target
     * @returns {Promise}
     *      resolved once target image was deleted
     */
    deleteTarget(tcId, targetId) {
        var path = PATH_GET_TARGET.replace(PLACEHOLDER_TC_ID, tcId).replace(PLACEHOLDER_TARGET_ID, targetId);

        return sendRequest('DELETE', path);
    }

    /**
     * Generates target collection. Note: You must call this to put target image changes live. Before calling this target images are only marked ass added/removed internally
     * @param {string} tcId id of target collection
     * @returns {Promise} JSON representation of the status of the operation
     *      resolved once the operation finished, for the result the service will be polled
     *      Note: Depending on the amount of targets this operation may take from seconds to minutes
     */
    generateTargetCollection(tcId) {
        var path = PATH_GENERATE_TC.replace(PLACEHOLDER_TC_ID, tcId);

        return sendAsyncRequest('POST', path);
    }
};

/**
 * HELPER method to send request to the Wikitude Cloud Targets API.
 *
 * @param {string} method
 *            request method (POST, GET, DELETE)
 * @param {string} path
 *            path of api end-point (appended to API_ENDPOINT_ROOT-url)
 * @param [payload]
 *            the JSON object that will be posted into the body
 * @returns {Promise}
 *            resolved once operation finished
 */
function sendRequest(method, path, payload) {
    return (
        sendApiRequest(method, path, payload)
            .then(response => {
                var jsonResponse;

                if ( hasJsonContent(response) ) {
                    jsonResponse = readJsonBody(response);
                }

                return jsonResponse;
            })
    );
}

function sendApiRequest(method, path, payload) {
    // prepare request
    var headers = {
        'X-Version': apiVersion,
        'X-Token': apiToken
    };

    var data;
    if (payload) {
        headers['Content-Type'] = CONTENT_TYPE_JSON;
        data = JSON.stringify(payload);
    }

    return (
        request(method, path, headers, data)
        .then(response => {
            if ( isResponseSuccess(response) ) {
                return response;
            } else {
                return (
                    readAPIError(response)
                        .then(error => {
                            throw error;
                        })
                );
            }
        })
    );
}

function request(method, path, headers, data) {
    return new Promise((fulfil, reject) => {
        var options = {
            // We mainly use HTTPS connections to encrypt the data that is sent across the net. The rejectUnauthorized
            // property set to false avoids that the HTTPS sendRequest fails when the certificate authority is not in the
            // certificate store. If you do not want to ignore unauthorized HTTPS connections, you need to add the HTTPS
            // certificate of the api.wikitude.com server to the certificate store and make it accessible in Node.js.
            // Otherwise, you need to use a http connection instead.
            rejectUnauthorized: false,
            hostname: API_ENDPOINT_ROOT,
            path,
            method,
            headers
        };

        // Create the request
        var request = https.request(options, fulfil);

        // On error, we reject
        request.on('error', reject);

        // write to body
        request.end(data);
    });
}

function isResponseSuccess(response) {
    var code = response.statusCode;

    return code === HTTP_OK || code === HTTP_ACCEPTED || code === HTTP_NO_CONTENT;
}

function readAPIError(response) {
    if ( hasJsonContent(response) ) {
        return readServiceError(response);
    } else {
        return readGeneralError(response);
    }
}

function hasJsonContent( response ) {
    var headers = response.headers;
    var contentType = headers['content-type'];
    var contentLength = headers['content-length'];

    return contentType === CONTENT_TYPE_JSON && contentLength !== "0";
}

function readServiceError( response ) {
    return (
        readJsonBody(response)
            .then(error => {
                var message = error.message;
                var code = error.code;
                var reason = error.reason;

                return new ServiceError( message, code, reason );
            })
    );
}

function readJsonBody( response ) {
    var body = readBody(response);

    return body.then(body => {
        try {
            return JSON.parse(body);
        } catch (error) {
            throw new Error(body);
        }
    });
}

function readBody( response ) {
    response.setEncoding('utf8');

    return new Promise( (fulfil, reject) => {
        var body = "";

        response
            .on('data', data => {
                body += data;
            })
            .on('end', () => fulfil(body))
            .on('error', reject)
        ;
    });
}

function readGeneralError(response) {
    return (
        readBody(response)
            .then(message => {
                var code = response.statusCode;

                return new APIError(message, code);
            })
    );
}

function sendAsyncRequest( method, path, payload ) {
    return (
        sendApiRequest(method, path, payload)
            .then(response => {
                var location = getLocation(response);
                var initialDelay = Promise.resolve(apiPollInterval);

                if (hasJsonContent(response)) {
                    initialDelay = readJsonBody(response)
                        .then(status => status.estimatedLatency)
                    ;
                }

                return (
                    initialDelay
                        .then(wait)
                        .then(() => pollStatus(location))
                );
            })
    );
}

function getLocation( response ) {
    return response.headers[HEADER_LOCATION];
}

function wait(milliseconds) {
    return new Promise( fulfil => {
        setTimeout(fulfil, milliseconds);
    });
}

function pollStatus(location ) {
    return (
        readStatus(location)
        .then(status => {
            if (isCompleted(status)) {
                return status;
            } else {
                return (
                    wait(apiPollInterval)
                    .then(() => pollStatus(location))
                );
            }
        })
    );
}

function readStatus(location) {
    return sendApiRequest("GET", location).then(readJsonBody);
}

function isCompleted(status) {
    return status.status === "COMPLETED";
}
