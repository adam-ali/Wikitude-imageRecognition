var World = {
	tracker: null,
    cloudRecognitionService: null,

	init: function initFn() {

		this.createTracker();
		this.createOverlays();
	},

	/*
		First an AR.ImageTracker connected with an AR.CloudRecognitionService needs to be created in order to start the recognition engine.
		It is initialized with your clinet token and the id of one of your target collections.
		Optional parameters are passed as object in the last argument. In this case callback functions for the onInitialized and onError triggers are set.
		Once the tracker is fully loaded the function trackerLoaded() is called, should there be an error initializing the CloudRecognitionService the
		function trackerError() is called instead.
	*/
    createTracker: function createTrackerFn() {
        
		World.cloudRecognitionService = new AR.CloudRecognitionService("76cb320bdb3a5843c389ec8b897beaa8", "58f5da0a3a3a24801d93d273", {
			onInitialized: this.trackerLoaded,
			onError: this.trackerError
		});

        World.tracker = new AR.ImageTracker(this.cloudRecognitionService, {
            onError: this.trackerError
        });
	},
	/////////////////////////
	startContinuousRecognition: function startContinuousRecognitionFn(interval) {
		/*
			With this function call the continuous recognition mode is started. It is passed four parameters, the first defines the interval in which
			a new recognition is started. It is set in milliseconds and the minimum value is 500. The second parameter defines a callback function
			that is called by the server if the recognition interval was set too high for the current network speed. The third parameter is again a callback which is fired
			when a recognition cycle is completed. The fourth and last paramater defines another callback function that is called in case an error occured during the client/server interaction.
		*/
		this.cloudRecognitionService.startContinuousRecognition(interval, this.onInterruption, this.onRecognition, this.onRecognitionError);
	},
	////////////////////////////
	/*
		Callback function to handle CloudTracker initializition errors.
	*/
	trackerError: function trackerErrorFn(errorMessage) {
		alert(errorMessage);
	},

	createOverlays: function createOverlaysFn() {
		
        /*
			To display a banner containing information about the current target as an augmentation an image resource is created and passed to the
			AR.ImageDrawable. A drawable is a visual component that can be connected to an IR target (AR.ImageResource) or a geolocated
			object (AR.GeoObject). The AR.ImageDrawable is initialized by the image and its size. Optional parameters allow to position it
			relative to the recognized target.
		*/
		this.bannerImg = new AR.ImageResource("assets/banner.jpg", {
			onLoaded: function (params) {
				AR.logger.info("IMAGE HAS BEEN LOADED")
			},
			onError: function (err) {
				AR.logger.error(err);
			}
        });
		this.bannerImgOverlay = new AR.ImageDrawable(this.bannerImg, 0.4, {
			translate: {
				y: -0.6
			}
		});
	},

	/*
		The onRecognition callback function defines two parameters. The first parameter is a boolean value which indicates if the server was able
		to detect the target, it's value will be 0 or 1 depending on the outcome. The second parameter a JSON Object will contain metadata about
		the recognized target, if no target was recognized the JSON object will be empty.
	*/
	onRecognition: function onRecognitionFn(recognized, response) {
		if (recognized) {
			/*
				Clean Resources from previous recognitions.
			*/
			if (World.wineLabel !== undefined) {
				World.wineLabel.destroy();
			}

			if (World.wineLabelOverlay !== undefined) {
				World.wineLabelOverlay.destroy();
			}

			/*
				To display the label of the recognized wine on top of the previously created banner, another overlay is defined. From the response
				object returned from the server the 'targetInfo.name' property is read to load the equally named image file.
				The zOrder property (defaults to 0) is set to 1 to make sure it will be positioned on top of the banner.
			*/
			World.wineLabel = new AR.ImageResource("assets/" + response.targetInfo.name + ".jpg",{
				onLoaded: function (params) {
				AR.logger.info("asset HAS BEEN LOADED")
				},
				onError: function (err) {
					AR.logger.error(`error loading rescource ${err}`);
				}
			});
			World.wineLabelOverlay = new AR.ImageDrawable(World.wineLabel, 0.27, {
				translate: {
					x: -0.5,
					y: -0.6
				},
				zOrder: 1
			});

			if (World.wineLabelAugmentation !== undefined) {
				World.wineLabelAugmentation.destroy();
			}

			/*
				The following combines everything by creating an AR.ImageTrackable using the Cloudtracker, the name of the image target and
				the drawables that should augment the recognized image.
			*/
			World.wineLabelAugmentation = new AR.ImageTrackable(World.tracker, response.targetInfo.name , {
				drawables: {
					cam: [World.bannerImgOverlay, World.wineLabelOverlay]
				}
			});
		}
	},
	///////////////
	onInterruption: function onInterruptionFn(suggestedInterval) {
			World.cloudRecognitionService.stopContinuousRecognition();
			World.cloudRecognitionService.startContinuousRecognition(suggestedInterval);
	},
/////////////////////
	onRecognitionError: function onRecognitionError(errorCode, errorMessage) {
		alert("error code: " + errorCode + " error message: " + JSON.stringify(errorMessage));
	},

	/*
		In this function the recognition will be started, it is triggered by the onClick event of the scanButton.
	*/
	scan: function scanFn() {
		/*
			The tracker recognize function is passed two callback functions. The first callback function will be called by the server after each
			recognition cycle. The second callback defines an on error callback function. It will be called if there is something wrong in
			your cloud archive.
		*/
		this.cloudRecognitionService.recognize(this.onRecognition, this.onRecognitionError);
	},

	trackerLoaded: function trackerLoadedFn() {
		World.startContinuousRecognition(750);
		World.showUserInstructions();
	},

	showUserInstructions: function showUserInstructionsFn() {
       
		var cssDivRight = " style='display: table-cell;vertical-align: middle; text-align: center;'";
		document.getElementById('messageBox').innerHTML =
			"<div" + cssDivRight + ">" +
				"<h3>Scan Image now</h3>" +
			"</div>";

		setTimeout(function() {
			var e = document.getElementById('messageBox');
			e.parentElement.removeChild(e);
		}, 10000);
	}
};
AR.logger.activateDebugMode();
World.init();