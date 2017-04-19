/**
 * TargetsAPI shows a simple example how to interact with the Wikitude Targets API.
 * 
 * This example is published under Apache License, Version 2.0 http://www.apache.org/licenses/LICENSE-2.0.html
 * 
 * @author Wikitude
 */

var token = '76cb320bdb3a5843c389ec8b897beaa8';

var ManagerApi = require('./ManagerAPI.js');

// create API using own token and version
var api = new ManagerApi(token, 2);

var EXAMPLE_IMAGE_URLS = [
    "http://s3-eu-west-1.amazonaws.com/web-api-hosting/examples_data/surfer.jpeg",
    "http://s3-eu-west-1.amazonaws.com/web-api-hosting/examples_data/biker.jpeg"
];

// create target collection
api.createTargetCollection("targetCollection")
    .then(createdTargetCollection => {
        var targetCollectionId = createdTargetCollection.id;
        console.log(`created targetCollection: ${targetCollectionId}`);

        return ( Promise.resolve()
            // rename targetCollection
            .then(() => api.renameTargetCollection(targetCollectionId, "renamed targetCollection"))
            .then(targetCollection => {
                console.log(`renamed targetCollection: ${targetCollection.id}`);
            })

            // Add multiple target images to the collection (Note this happens in parallel to the previous deletion test)
            .then(() => {
                var target = { name: "myTarget0", imageUrl: EXAMPLE_IMAGE_URLS[0] };

                return api.addTarget(targetCollectionId, target)
            })
            .then(target => {
                console.log(`created target ${target.id}`);
            })


            // Add multiple target images to the collection (Note this happens in parallel to the previous deletion test)
            .then(() => {
                var targets = [
                    { name: "myTarget1", imageUrl: EXAMPLE_IMAGE_URLS[1] }
                ];

                return api.addTargets(targetCollectionId, targets)
            })
            .then(status => {
                console.log(`created targets, generation id: ${status.generationId}`);
            })

            // generate target collection
            .then(() => {
                console.log(`PUBLISH TARGET COLLECTION`);
            })
            .then(() => api.generateTargetCollection(targetCollectionId))
            .then(archive => {
                console.log(`generated cloud archive: ${archive.id}`);
            })

            // clean up and delete targetCollection
            .then(() => api.deleteTargetCollection(targetCollectionId))
            .then(() => {
                console.log(`removed targetCollection: ${targetCollectionId}`);
            })
        );
    })
    .catch(error => {
        console.error("ERROR OCCURRED:", error.message, error);
    })
;