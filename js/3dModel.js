var World = {
	loaded: false,
	rotating: false,
	trackableVisible: false,
    resourcesLoaded: false,

	init: function initFn() {

		this.createOverlays();
	},
	switchCam: function switchCamFn() {
		AR.logger.info("cam switched");
		
		if (AR.hardware.camera.position == AR.CONST.CAMERA_POSITION.FRONT) {
			AR.hardware.camera.position = AR.CONST.CAMERA_POSITION.BACK
		} else {
			AR.hardware.camera.position = AR.CONST.CAMERA_POSITION.FRONT			
		}
	},
	createOverlays: function createOverlaysFn() {
		/*
			First an AR.ImageTracker needs to be created in order to start the recognition engine. It is initialized with a AR.TargetCollectionResource specific to the target collection that should be used. Optional parameters are passed as object in the last argument. In this case a callback function for the onTargetsLoaded trigger is set. Once the tracker loaded all its target images, the function worldLoaded() is called.
			Important: If you replace the tracker file with your own, make sure to change the target name accordingly.
			Use a specific target name to respond only to a certain target or use a wildcard to respond to any or a certain group of targets.
		*/
		this.targetCollectionResource = new AR.TargetCollectionResource("assets/tracker.wtc", {
			onLoaded: function () {
				World.resourcesLoaded = true;
				this.loadingStep;
			}
		});

		this.tracker = new AR.ImageTracker(this.targetCollectionResource, {
			onTargetsLoaded: this.loadingStep
		});

		/*
			3D content within Wikitude can only be loaded from Wikitude 3D Format files (.wt3). This is a compressed binary format for describing 3D content which is optimized for
			 fast loading and handling of 3D content on a mobile device. You still can use 3D models from your favorite 3D modeling tools (Autodesk® Maya® or Blender) but you'll need
			  to convert them into the wt3 file format. The Wikitude 3D Encoder desktop application (Windows and Mac) encodes your 3D source file. You can download it from our website. The Encoder can handle Autodesk® FBX® files (.fbx) and the open standard Collada (.dae) file formats for encoding to .wt3. 
			Create an AR.Model and pass the URL to the actual .wt3 file of the model. Additional options allow for scaling, rotating and positioning the model in the scene.
			A function is attached to the onLoaded trigger to receive a notification once the 3D model is fully loaded. Depending on the size of the model and where it is stored (locally or remotely) it might take some time to completely load and it is recommended to inform the user about the loading time.
		*/
		this.modelCar = new AR.Model("assets/earth.wt3", {
			onLoaded: this.loadingStep,
			scale: {
				x: 0.3,
				y: 0.3,
				z: 0.3
			},
			translate: {
				x: 0.0,
				y: 0.0,
				z: 0.5
			},
			rotate: {
				x: 0.0,
				y: 180.0,
			z: -25
			}
		});

	this.rotationAnimation = new AR.PropertyAnimation(this.modelCar, "rotate.z", -25, 335, 10000);

	World.rotationAnimation.start(-1)

		/*
			To receive a notification once the image target is inside the field of vision the onEnterFieldOfVision trigger of the AR.ImageTrackable is used. In the example the function appear() is attached. Within the appear function the previously created AR.AnimationGroup is started by calling its start() function which plays the animation once.
		*/
		var trackable = new AR.ImageTrackable(this.tracker, "*", {
			drawables: {
				cam: [this.modelCar]
			}
		});
	},

	loadingStep: function loadingStepFn() {
		if (!World.loaded && World.resourcesLoaded && World.modelCar.isLoaded()) {
			World.loaded = true;
			
			// if ( World.trackableVisible && !World.appearingAnimation.isRunning() ) {
			// 	World.appearingAnimation.start();
			// }
			
						
			var cssDivLeft = " style='display: table-cell;vertical-align: middle; text-align: right; width: 50%; padding-right: 15px;'";
			var cssDivRight = " style='display: table-cell;vertical-align: middle; text-align: left;'";
			document.getElementById('loadingMessage').innerHTML =
				"<div" + cssDivLeft + ">Scan any of the codes</div>";

			// Remove Scan target message after 10 sec.
			setTimeout(function() {
				var e = document.getElementById('loadingMessage');
				e.parentElement.removeChild(e);
				
			}, 7000);
		}
	},

	disappear: function disappearFn() {
		World.trackableVisible = false;
	}
};

AR.logger.activateDebugMode();
World.init();
