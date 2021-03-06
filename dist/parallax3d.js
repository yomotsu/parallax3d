/*!
 * parallax3d
 * https://github.com/yomotsu/parallax3d
 * (c) 2017 @yomotsu
 * Released under the MIT License.
 */
(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.parallax3d = {}));
}(this, (function (exports) { 'use strict';

	var EventDispatcher = (function () {
	    function EventDispatcher() {
	        this._listeners = {};
	    }
	    EventDispatcher.prototype.addEventListener = function (type, listener) {
	        var listeners = this._listeners;
	        if (listeners[type] === undefined)
	            listeners[type] = [];
	        if (listeners[type].indexOf(listener) === -1)
	            listeners[type].push(listener);
	    };
	    EventDispatcher.prototype.removeEventListener = function (type, listener) {
	        var listeners = this._listeners;
	        var listenerArray = listeners[type];
	        if (listenerArray !== undefined) {
	            var index = listenerArray.indexOf(listener);
	            if (index !== -1)
	                listenerArray.splice(index, 1);
	        }
	    };
	    EventDispatcher.prototype.dispatchEvent = function (event) {
	        var listeners = this._listeners;
	        var listenerArray = listeners[event.type];
	        if (listenerArray !== undefined) {
	            event.target = this;
	            var array = listenerArray.slice(0);
	            for (var i = 0, l = array.length; i < l; i++) {
	                array[i].call(this, event);
	            }
	        }
	    };
	    return EventDispatcher;
	}());

	var THREE;
	var GLTFLoader;
	var installer = new EventDispatcher();
	function install(libs) {
	    THREE = libs.THREE;
	    GLTFLoader = libs.GLTFLoader;
	    installer.dispatchEvent({ type: 'install', THREE: THREE, GLTFLoader: GLTFLoader });
	}

	var PIXEL_RATIO = window.devicePixelRatio || 1;

	function throttle(fn, threshold) {
	    var last, deferTimer;
	    return function () {
	        var now = Date.now();
	        if (last && now < last + threshold) {
	            clearTimeout(deferTimer);
	            deferTimer = window.setTimeout(function () {
	                last = now;
	                fn();
	            }, threshold);
	        }
	        else {
	            last = now;
	            fn();
	        }
	    };
	}

	var reflowWatcher = new EventDispatcher();
	var onLoadListeners = new WeakMap();
	var onElementLoad = function () { return reflowWatcher.dispatchEvent({ type: 'reflow' }); };
	var callback = function (mutationsList) {
	    for (var _i = 0, mutationsList_1 = mutationsList; _i < mutationsList_1.length; _i++) {
	        var mutation = mutationsList_1[_i];
	        if (mutation.type === 'childList') {
	            var isNodesAdded = mutation.addedNodes.length >= 1;
	            var isNodesRemoved = mutation.removedNodes.length >= 1;
	            if (isNodesRemoved) {
	                reflowWatcher.dispatchEvent({ type: 'reflow' });
	                mutation.addedNodes.forEach(function ($node) {
	                    var onElementLoad = onLoadListeners.get($node);
	                    onElementLoad && $node.removeEventListener('load', onElementLoad);
	                });
	            }
	            if (isNodesAdded) {
	                reflowWatcher.dispatchEvent({ type: 'reflow' });
	                mutation.addedNodes.forEach(function ($node) {
	                    var isAsyncNode = $node.nodeName === 'IMG';
	                    if (isAsyncNode) {
	                        onLoadListeners.set($node, onElementLoad);
	                        $node.addEventListener('load', onElementLoad);
	                    }
	                });
	            }
	        }
	    }
	};
	var observer = new MutationObserver(callback);
	observer.observe(document.body, {
	    childList: true,
	    characterData: true,
	    subtree: true,
	});
	Array.prototype.forEach.call(document.querySelectorAll('img'), function ($img) {
	    var isLoaded = $img.naturalWidth !== 0;
	    if (isLoaded)
	        return;
	    onLoadListeners.set($img, onElementLoad);
	    $img.addEventListener('load', onElementLoad);
	});
	var throttled = throttle(function () { return reflowWatcher.dispatchEvent({ type: 'reflow' }); }, 200);
	window.addEventListener('resize', throttled);
	window.addEventListener('scroll', function () { return reflowWatcher.dispatchEvent({ type: 'scroll' }); });

	var THREE$1;
	var _mat4;
	installer.addEventListener('install', function (libs) {
	    THREE$1 = libs.THREE;
	    _mat4 = new THREE$1.Matrix4();
	});
	var LayoutField = (function () {
	    function LayoutField(canvas) {
	        var _this = this;
	        this.width = window.innerWidth;
	        this.height = window.innerHeight;
	        this.scene = new THREE$1.Scene();
	        this.camera = new THREE$1.PerspectiveCamera(60, this.width / this.height, 1, 1000);
	        this.layoutObjects = [];
	        this._updated = false;
	        this._clock = new THREE$1.Clock();
	        this._viewFrustum = new THREE$1.Frustum();
	        this._clock = new THREE$1.Clock();
	        this.canvas = canvas || document.createElement('canvas');
	        this.renderer = new THREE$1.WebGLRenderer({
	            canvas: this.canvas,
	            alpha: true
	        });
	        this.renderer.setClearAlpha(0);
	        this.renderer.setPixelRatio(PIXEL_RATIO);
	        this.renderer.toneMapping = THREE$1.ACESFilmicToneMapping;
	        this.renderer.outputEncoding = THREE$1.sRGBEncoding;
	        document.body.appendChild(this.renderer.domElement);
	        this.renderer.domElement.style.pointerEvents = 'none';
	        this.renderer.domElement.style.position = 'fixed';
	        this.renderer.domElement.style.top = '0';
	        this.renderer.domElement.style.right = '0';
	        this.renderer.domElement.style.bottom = '0';
	        this.renderer.domElement.style.left = '0';
	        this.renderer.domElement.style.display = 'block';
	        var hemiLight = new THREE$1.HemisphereLight(0xcccccc, 0x332222);
	        hemiLight.position.set(0, 0, 1);
	        this.scene.add(hemiLight);
	        this.updateSize();
	        this.scroll = this.scroll.bind(this);
	        this.reflow = this.reflow.bind(this);
	        reflowWatcher.addEventListener('scroll', this.scroll);
	        reflowWatcher.addEventListener('reflow', this.reflow);
	        var animationLoop = function () {
	            requestAnimationFrame(animationLoop);
	            if (!_this.needsRepaint)
	                return;
	            var delta = _this._clock.getDelta();
	            _this.layoutObjects.forEach(function (layoutObject) { return layoutObject.active && layoutObject.update(delta); });
	            _this.renderer.render(_this.scene, _this.camera);
	            _this._updated = false;
	        };
	        animationLoop();
	    }
	    Object.defineProperty(LayoutField.prototype, "needsRepaint", {
	        get: function () {
	            return (this._updated ||
	                this.layoutObjects.some(function (layoutObject) { return layoutObject.active; }));
	        },
	        enumerable: true,
	        configurable: true
	    });
	    LayoutField.prototype.scroll = function () {
	        var _this = this;
	        this._viewFrustum.setFromMatrix(_mat4.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
	        this.layoutObjects.forEach(function (layoutObject) {
	            var x = -_this.width * 0.5 + layoutObject.domPosition.x - window.scrollX;
	            var y = _this.height * 0.5 - layoutObject.domPosition.y + window.scrollY;
	            layoutObject.object.position.set(x, y, 0);
	            layoutObject.inView = _this.inViewFrustum(layoutObject);
	        });
	        this._updated = true;
	    };
	    LayoutField.prototype.reflow = function () {
	        this.updateSize();
	        this.layout();
	        this.scroll();
	    };
	    LayoutField.prototype.throttledReflow = function () { };
	    LayoutField.prototype.layout = function () {
	        var _this = this;
	        this.layoutObjects.forEach(function (layoutObject) {
	            layoutObject.layout();
	            var x = -_this.width * 0.5 + layoutObject.domPosition.x - window.scrollX;
	            var y = _this.height * 0.5 - layoutObject.domPosition.y + window.scrollY;
	            layoutObject.object.position.set(x, y, 0);
	        });
	    };
	    LayoutField.prototype.add = function (layoutObject) {
	        var _this = this;
	        this.scene.add(layoutObject.object);
	        this.layoutObjects.push(layoutObject);
	        var x = -this.width * 0.5 + layoutObject.domPosition.x - window.scrollX;
	        var y = this.height * 0.5 - layoutObject.domPosition.y + window.scrollY;
	        layoutObject.object.position.set(x, y, 0);
	        this.renderer.render(this.scene, this.camera);
	        layoutObject.addEventListener('loaded', function () {
	            _this._updated = true;
	        });
	    };
	    LayoutField.prototype.remove = function (layoutObject) {
	        var index = this.layoutObjects.indexOf(layoutObject);
	        if (index === -1)
	            return;
	        layoutObject.dispose();
	        this.scene.remove(layoutObject.object);
	        this.layoutObjects.splice(index, 1);
	        this._updated = true;
	    };
	    LayoutField.prototype.updateSize = function () {
	        this.width = window.innerWidth;
	        this.height = window.innerHeight;
	        var fov = this.camera.getEffectiveFOV() * THREE$1.Math.DEG2RAD;
	        var pixelPerfectDistance = this.height * 0.5 / Math.tan(fov * 0.5);
	        this.camera.position.z = pixelPerfectDistance;
	        this.camera.aspect = this.width / this.height;
	        this.camera.far = pixelPerfectDistance * 2;
	        this.camera.updateProjectionMatrix();
	        this._viewFrustum.setFromMatrix(_mat4.multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
	        this.renderer.setSize(this.width, this.height);
	    };
	    LayoutField.prototype.inViewFrustum = function (layoutObject) {
	        var _this = this;
	        if (!layoutObject.meshes.length)
	            return false;
	        return layoutObject.meshes.some(function (mesh) { return _this._viewFrustum.intersectsObject(mesh); });
	    };
	    LayoutField.prototype.applyEnvMap = function (img) {
	        var _this = this;
	        return new Promise(function (resolve) {
	            var hdirTexture = new THREE$1.Texture();
	            if (typeof img === 'string') {
	                hdirTexture.image = new Image();
	                hdirTexture.image.src = img;
	            }
	            else {
	                hdirTexture.image = img;
	            }
	            var onImgLoad = function () {
	                hdirTexture.needsUpdate = true;
	                var pmremGenerator = new THREE$1.PMREMGenerator(_this.renderer);
	                var envMap = pmremGenerator.fromEquirectangular(hdirTexture).texture;
	                _this.scene.environment = envMap;
	                resolve(envMap);
	                _this._updated = true;
	                pmremGenerator.dispose();
	                return;
	            };
	            var imgLoaded = hdirTexture.image.naturalWidth !== 0;
	            if (imgLoaded) {
	                onImgLoad();
	            }
	            else {
	                hdirTexture.image.onload = onImgLoad;
	            }
	        });
	    };
	    return LayoutField;
	}());

	/*! *****************************************************************************
	Copyright (c) Microsoft Corporation. All rights reserved.
	Licensed under the Apache License, Version 2.0 (the "License"); you may not use
	this file except in compliance with the License. You may obtain a copy of the
	License at http://www.apache.org/licenses/LICENSE-2.0

	THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
	KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
	WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
	MERCHANTABLITY OR NON-INFRINGEMENT.

	See the Apache Version 2.0 License for specific language governing permissions
	and limitations under the License.
	***************************************************************************** */
	/* global Reflect, Promise */

	var extendStatics = function(d, b) {
	    extendStatics = Object.setPrototypeOf ||
	        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
	        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
	    return extendStatics(d, b);
	};

	function __extends(d, b) {
	    extendStatics(d, b);
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	}

	/*!
	 * tween-values
	 * https://github.com/yomotsu/tween-values
	 * (c) 2019 @yomotsu
	 * Released under the MIT License.
	 */
	/*! *****************************************************************************
	Copyright (c) Microsoft Corporation. All rights reserved.
	Licensed under the Apache License, Version 2.0 (the "License"); you may not use
	this file except in compliance with the License. You may obtain a copy of the
	License at http://www.apache.org/licenses/LICENSE-2.0

	THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
	KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
	WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
	MERCHANTABLITY OR NON-INFRINGEMENT.

	See the Apache Version 2.0 License for specific language governing permissions
	and limitations under the License.
	***************************************************************************** */
	/* global Reflect, Promise */

	var extendStatics$1 = function(d, b) {
	    extendStatics$1 = Object.setPrototypeOf ||
	        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
	        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
	    return extendStatics$1(d, b);
	};

	function __extends$1(d, b) {
	    extendStatics$1(d, b);
	    function __() { this.constructor = d; }
	    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
	}

	var EventDispatcher$1 = (function () {
	    function EventDispatcher() {
	        this._listeners = {};
	    }
	    EventDispatcher.prototype.addEventListener = function (type, listener) {
	        var listeners = this._listeners;
	        if (listeners[type] === undefined)
	            listeners[type] = [];
	        if (listeners[type].indexOf(listener) === -1) {
	            listeners[type].push(listener);
	        }
	    };
	    EventDispatcher.prototype.removeAllEventListeners = function (type) {
	        if (!type) {
	            this._listeners = {};
	            return;
	        }
	        if (Array.isArray(this._listeners[type]))
	            this._listeners[type].length = 0;
	    };
	    EventDispatcher.prototype.dispatchEvent = function (event) {
	        var listeners = this._listeners;
	        var listenerArray = listeners[event.type];
	        if (listenerArray !== undefined) {
	            event.target = this;
	            var array = listenerArray.slice(0);
	            for (var i = 0, l = array.length; i < l; i++) {
	                array[i].call(this, event);
	            }
	        }
	    };
	    return EventDispatcher;
	}());

	function easeLinear(t) {
	    return t;
	}

	function cloneValues(values) {
	    var result = {};
	    return Object.assign(result, values);
	}
	function lerpValues(a, b, alpha, out) {
	    for (var key in out) {
	        out[key] = (b[key] - a[key]) * alpha;
	    }
	}

	var TweenGroup = (function (_super) {
	    __extends$1(TweenGroup, _super);
	    function TweenGroup() {
	        var tweens = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            tweens[_i] = arguments[_i];
	        }
	        var _this = _super.call(this) || this;
	        _this._group = [];
	        _this.add.apply(_this, tweens);
	        return _this;
	    }
	    TweenGroup.prototype.add = function () {
	        var _this = this;
	        var tweens = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            tweens[_i] = arguments[_i];
	        }
	        tweens.forEach(function (tween) {
	            if (_this._group.indexOf(tween) !== -1)
	                return;
	            _this._group.push(tween);
	        });
	    };
	    TweenGroup.prototype.remove = function () {
	        var _this = this;
	        var tweens = [];
	        for (var _i = 0; _i < arguments.length; _i++) {
	            tweens[_i] = arguments[_i];
	        }
	        tweens.forEach(function (tween) {
	            var index = _this._group.indexOf(tween);
	            if (index === -1)
	                return;
	            _this._group.splice(index, 1);
	        });
	    };
	    TweenGroup.prototype.update = function (delta) {
	        return this._group.forEach(function (tween) { return tween.update(delta); });
	    };
	    TweenGroup.prototype.isRunning = function () {
	        return this._group.some(function (tween) { return tween.running; });
	    };
	    return TweenGroup;
	}(EventDispatcher$1));

	var activeTweens = new TweenGroup();

	var Tween = (function (_super) {
	    __extends$1(Tween, _super);
	    function Tween(startValues, endValues, duration, easing) {
	        if (easing === void 0) { easing = easeLinear; }
	        var _this = _super.call(this) || this;
	        _this._running = false;
	        _this._elapsed = 0;
	        _this._startValues = startValues;
	        _this._endValues = endValues;
	        _this._duration = duration;
	        _this.easing = easing;
	        _this._currentValues = cloneValues(startValues);
	        return _this;
	    }
	    Object.defineProperty(Tween.prototype, "running", {
	        get: function () {
	            return this._running;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Tween.prototype, "progress", {
	        get: function () {
	            return this._elapsed / this._duration;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Object.defineProperty(Tween.prototype, "currentValues", {
	        get: function () {
	            return this._currentValues;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    Tween.prototype.reset = function () {
	        this._running = false;
	        this._elapsed = 0;
	        return this;
	    };
	    Tween.prototype.play = function () {
	        this._running = true;
	        activeTweens.add(this);
	        this.dispatchEvent({ type: 'started' });
	        return this;
	    };
	    Tween.prototype.pause = function () {
	        this._running = false;
	        activeTweens.remove(this);
	        this.dispatchEvent({ type: 'paused' });
	        return this;
	    };
	    Tween.prototype.update = function (delta) {
	        if (!this._running)
	            return this;
	        this._elapsed += delta;
	        if (this._duration <= this._elapsed) {
	            this._elapsed = this._duration;
	            this._running = false;
	            this.dispatchEvent({ type: 'update' });
	            this.dispatchEvent({ type: 'ended' });
	            activeTweens.remove(this);
	            return this;
	        }
	        lerpValues(this._startValues, this._endValues, this.progress, this._currentValues);
	        this.dispatchEvent({ type: 'update' });
	        return this;
	    };
	    Tween.prototype.dispose = function () {
	        this.removeAllEventListeners();
	    };
	    return Tween;
	}(EventDispatcher$1));

	var EPSILON = 1e-5;
	function approxEqual(a, b) {
	    return Math.abs(a - b) < EPSILON;
	}

	function exponentialOut(t) {
	    return t === 1.0 ? t : 1.0 - Math.pow(2.0, -10.0 * t);
	}

	/*!
	 * in-view-observer
	 * https://github.com/yomotsu/in-view-observer
	 * (c) 2017 @yomotsu
	 * Released under the MIT License.
	 */
	var State;
	(function (State) {
	    State[State["WHOLE_IN"] = 0] = "WHOLE_IN";
	    State[State["PART_IN"] = 1] = "PART_IN";
	    State[State["OUT"] = 2] = "OUT";
	})(State || (State = {}));

	function throttle$1(fn, threshold) {
	    var last, deferTimer;
	    return function () {
	        var now = Date.now();
	        if (last && now < last + threshold) {
	            clearTimeout(deferTimer);
	            deferTimer = window.setTimeout(function () {
	                last = now;
	                fn();
	            }, threshold);
	        }
	        else {
	            last = now;
	            fn();
	        }
	    };
	}

	var viewHeight = 0;
	function onresize() {
	    viewHeight = (window.innerHeight || document.documentElement.clientHeight);
	}
	onresize();
	window.addEventListener('resize', throttle$1(onresize, 250));
	function isElementInViewport(el, offsetTop, offsetBottom) {
	    if (offsetTop === void 0) { offsetTop = 0; }
	    if (offsetBottom === void 0) { offsetBottom = 0; }
	    var rect = el.getBoundingClientRect();
	    var rectTop = rect.top + offsetTop;
	    var rectBottom = rect.bottom + offsetBottom;
	    var rectHeight = rect.height - offsetTop + offsetBottom;
	    var partIn = ((0 < -rectTop && -rectTop < rectHeight) ||
	        (rectBottom - rectHeight < viewHeight && viewHeight < rectBottom));
	    var wholeIn = (rectTop >= 0 &&
	        rectBottom <= viewHeight);
	    return {
	        partIn: partIn,
	        wholeIn: wholeIn
	    };
	}

	var WatchTarget = (function () {
	    function WatchTarget(el, offsetTop, offsetBottom, onEnterStart, onEnterEnd, onLeaveStart, onLeaveEnd) {
	        if (offsetTop === void 0) { offsetTop = 0; }
	        if (offsetBottom === void 0) { offsetBottom = 0; }
	        if (onEnterStart === void 0) { onEnterStart = function () { }; }
	        if (onEnterEnd === void 0) { onEnterEnd = function () { }; }
	        if (onLeaveStart === void 0) { onLeaveStart = function () { }; }
	        if (onLeaveEnd === void 0) { onLeaveEnd = function () { }; }
	        this.willRemove = false;
	        var inView = isElementInViewport(el, offsetTop, offsetBottom);
	        if (inView.partIn && !!onEnterStart)
	            onEnterStart();
	        if (inView.wholeIn && !!onEnterEnd)
	            onEnterEnd();
	        this.el = el;
	        this.offsetTop = offsetTop;
	        this.offsetBottom = offsetBottom;
	        this.onEnterStart = onEnterStart;
	        this.onEnterEnd = onEnterEnd;
	        this.onLeaveStart = onLeaveStart;
	        this.onLeaveEnd = onLeaveEnd;
	        this.state = inView.wholeIn ? State.WHOLE_IN : inView.partIn ? State.PART_IN : State.OUT;
	    }
	    return WatchTarget;
	}());

	var onScrollListeners = [];
	var onViewChangeHandler = function () {
	    for (var i = 0, l = onScrollListeners.length; i < l; i++) {
	        var watchTargets = onScrollListeners[i];
	        var willRemoveIndices = [];
	        for (var j = 0, m = watchTargets.length; j < m; j++) {
	            var watchTarget = watchTargets[j];
	            var lastState = watchTarget.state;
	            var inView = isElementInViewport(watchTarget.el, watchTarget.offsetTop, watchTarget.offsetBottom);
	            var newState = inView.wholeIn ? State.WHOLE_IN : inView.partIn ? State.PART_IN : State.OUT;
	            var hasChanged = lastState !== newState;
	            if (watchTarget.willRemove) {
	                willRemoveIndices.push(j);
	            }
	            if (hasChanged && newState === State.WHOLE_IN) {
	                watchTarget.state = newState;
	                watchTarget.onEnterEnd();
	                continue;
	            }
	            if (hasChanged &&
	                lastState === State.OUT &&
	                newState === State.PART_IN) {
	                watchTarget.state = newState;
	                watchTarget.onEnterStart();
	                continue;
	            }
	            if (hasChanged &&
	                lastState === State.PART_IN &&
	                newState === State.OUT) {
	                watchTarget.state = newState;
	                watchTarget.onLeaveEnd();
	                continue;
	            }
	            if (hasChanged && !inView.wholeIn) {
	                watchTarget.state = newState;
	                watchTarget.onLeaveStart();
	                continue;
	            }
	        }
	        for (var j = willRemoveIndices.length; j--;) {
	            watchTargets.splice(willRemoveIndices[j], 1);
	        }
	    }
	};
	window.addEventListener('scroll', throttle$1(onViewChangeHandler, 100));
	window.addEventListener('resize', throttle$1(onViewChangeHandler, 250));
	var InViewObserver = (function () {
	    function InViewObserver() {
	        this.watchTargets = [];
	        onScrollListeners.push(this.watchTargets);
	    }
	    InViewObserver.prototype.add = function (watchTargetParam) {
	        var watchTarget = new WatchTarget(watchTargetParam.el, watchTargetParam.offsetTop, watchTargetParam.offsetBottom, watchTargetParam.onEnterStart, watchTargetParam.onEnterEnd, watchTargetParam.onLeaveStart, watchTargetParam.onLeaveEnd);
	        this.watchTargets.push(watchTarget);
	        return watchTarget;
	    };
	    InViewObserver.prototype.remove = function (el) {
	        this.watchTargets.some(function (obj) {
	            if (obj.el === el) {
	                obj.willRemove = true;
	                return true;
	            }
	            return false;
	        });
	    };
	    InViewObserver.prototype.reset = function () {
	        this.watchTargets.length = 0;
	    };
	    InViewObserver.isInView = function (el, offsetTop, offsetBottom) {
	        if (offsetTop === void 0) { offsetTop = 0; }
	        if (offsetBottom === void 0) { offsetBottom = 0; }
	        return isElementInViewport(el, offsetTop, offsetBottom);
	    };
	    return InViewObserver;
	}());

	var inViewObserver = new InViewObserver();
	var isInView = InViewObserver.isInView;

	function deepDispose(object3D) {
	    object3D.traverse(function (_object3D) { return dispose(_object3D); });
	}
	function dispose(object3D) {
	    if (!!object3D.geometry) {
	        object3D.geometry.dispose();
	        object3D.geometry = undefined;
	    }
	    if (!!object3D.material && Array.isArray(object3D.material)) {
	        object3D.material.forEach(function (material) { return disposeMaterial(material); });
	    }
	    else if (!!object3D.material) {
	        disposeMaterial(object3D.material);
	    }
	}
	function disposeMaterial(material) {
	    Object.keys(material).forEach(function (propertyName) {
	        if (!!material[propertyName] && typeof material[propertyName].dispose === 'function') {
	            material[propertyName].dispose();
	        }
	    });
	    material.dispose();
	    material = undefined;
	}

	var THREE$2;
	installer.addEventListener('install', function (libs) {
	    THREE$2 = libs.THREE;
	});
	var LayoutObject = (function (_super) {
	    __extends(LayoutObject, _super);
	    function LayoutObject(el, object) {
	        if (object === void 0) { object = null; }
	        var _this = _super.call(this) || this;
	        _this.domPosition = new THREE$2.Vector2();
	        _this.domSize = new THREE$2.Vector2();
	        _this.meshes = [];
	        _this.active = false;
	        _this.animated = false;
	        _this._inView = false;
	        _this.el = el;
	        _this.object = object || new THREE$2.Mesh(new THREE$2.SphereBufferGeometry(0.5, 32, 32), new THREE$2.MeshNormalMaterial());
	        _this.layout();
	        return _this;
	    }
	    Object.defineProperty(LayoutObject.prototype, "inView", {
	        get: function () {
	            return this._inView;
	        },
	        set: function (inView) {
	            this._inView = inView;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    LayoutObject.prototype.layout = function () {
	        var domRect = this.el.getBoundingClientRect();
	        this.domPosition.set(domRect.left + window.scrollX + domRect.width * 0.5, domRect.top + window.scrollY + domRect.height * 0.5);
	        this.domSize.set(domRect.width, domRect.height);
	    };
	    LayoutObject.prototype.update = function (_) { };
	    LayoutObject.prototype.dispose = function () {
	        deepDispose(this.object);
	    };
	    return LayoutObject;
	}(EventDispatcher));

	var DURATION = 0.6;
	var _v2;
	var THREE$3;
	installer.addEventListener('install', function (libs) {
	    THREE$3 = libs.THREE;
	    _v2 = new THREE$3.Vector2();
	});
	var LayoutParticleImageObject = (function (_super) {
	    __extends(LayoutParticleImageObject, _super);
	    function LayoutParticleImageObject(el, imgSrc) {
	        var _this = _super.call(this, el) || this;
	        _this._tween = new Tween({ progress: 0 }, { progress: 1 }, DURATION);
	        var textureUrl = typeof imgSrc === 'string' ? imgSrc : imgSrc.src;
	        var texture = new THREE$3.TextureLoader().load(textureUrl, function () { });
	        texture.magFilter = THREE$3.NearestFilter;
	        texture.minFilter = THREE$3.NearestMipMapNearestFilter;
	        var material = new THREE$3.ShaderMaterial({
	            uniforms: {
	                opacity: { value: 0 },
	                intensity: { value: 0 },
	                map: { value: texture },
	            },
	            vertexShader: "\n\t\t\t\tattribute vec3 random;\n\t\t\t\tuniform float intensity;\n\t\t\t\tvarying vec2 vUv;\n\n\t\t\t\tvoid main() {\n\t\t\t\t\tvec4 modelViewPosition = modelViewMatrix * vec4( position + ( random * intensity ), 1.0 );\n\t\t\t\t\tgl_Position = projectionMatrix * modelViewPosition;\n\t\t\t\t\tgl_PointSize = " + PIXEL_RATIO.toFixed(1) + ";\n\t\t\t\t\tvUv = uv;\n\t\t\t\t}\n\t\t\t",
	            fragmentShader: "\n\t\t\t\tuniform sampler2D map;\n\t\t\t\tuniform float opacity;\n\t\t\t\tvarying vec2 vUv;\n\n\t\t\t\tvoid main() {\n\t\t\t\t\tvec4 color = texture2D( map, vec2( vUv ) );\n\t\t\t\t\tgl_FragColor = vec4( vec3( color.xyz ), color.w * opacity );\n\t\t\t\t}\n\t\t\t",
	        });
	        material.transparent = true;
	        _this.object = new THREE$3.Points(new THREE$3.BufferGeometry(), material);
	        _this.meshes.push(_this.object);
	        _this._makeGeometry();
	        _this.progress = 0;
	        _this._tween.addEventListener('update', function () {
	            _this.progress = _this._tween.currentValues.progress;
	        });
	        _this._tween.addEventListener('ended', function () {
	            _this.progress = 1;
	            _this.active = false;
	            _this.dispatchEvent({ type: 'animationend' });
	        });
	        if (isInView(_this.el).partIn) {
	            _this.onEnter();
	        }
	        else {
	            inViewObserver.add({
	                el: _this.el,
	                onEnterStart: function () {
	                    _this.onEnter();
	                    inViewObserver.remove(_this.el);
	                },
	                onEnterEnd: function () {
	                    _this.onEnter();
	                    inViewObserver.remove(_this.el);
	                },
	            });
	        }
	        return _this;
	    }
	    Object.defineProperty(LayoutParticleImageObject.prototype, "progress", {
	        set: function (progress) {
	            var intensity = 1 - progress;
	            var opacity = exponentialOut(progress);
	            this.object.material.uniforms.intensity.value = intensity;
	            this.object.material.uniforms.opacity.value = opacity;
	        },
	        enumerable: true,
	        configurable: true
	    });
	    LayoutParticleImageObject.prototype.layout = function () {
	        var oldDomSize = _v2.copy(this.domSize);
	        _super.prototype.layout.call(this);
	        if (approxEqual(oldDomSize.x, this.domSize.x) &&
	            approxEqual(oldDomSize.y, this.domSize.y))
	            return;
	        this._makeGeometry();
	    };
	    LayoutParticleImageObject.prototype.update = function (delta) {
	        this._tween.update(delta);
	    };
	    LayoutParticleImageObject.prototype.dispose = function () {
	        var geometry = this.object.geometry;
	        var material = this.object.material;
	        material.uniforms.map.value.dispose();
	        material.dispose();
	        geometry.dispose();
	    };
	    LayoutParticleImageObject.prototype.onEnter = function () {
	        this.active = true;
	        this._tween.play();
	    };
	    LayoutParticleImageObject.prototype._makeGeometry = function () {
	        var _this = this;
	        var geometry = new THREE$3.PlaneBufferGeometry(this.domSize.width, this.domSize.height, this.domSize.width, this.domSize.height);
	        var randArray = geometry.attributes.position.array.map(function (_, i) {
	            return (i === 0 ? Math.random() * _this.domSize.width * 8 - _this.domSize.width * 4 :
	                i === 1 ? Math.random() * _this.domSize.height * 4 - _this.domSize.height * 2 :
	                    Math.random() * 300 - 150);
	        });
	        geometry.setAttribute('random', new THREE$3.BufferAttribute(randArray, geometry.attributes.position.itemSize));
	        this.object.geometry.dispose();
	        this.object.geometry = geometry;
	        this.object.geometry.computeBoundingSphere();
	    };
	    return LayoutParticleImageObject;
	}(LayoutObject));

	function extractMeshes(object) {
	    var meshes = [];
	    object.traverse(function (node) {
	        var mesh = node;
	        if (mesh.geometry) {
	            mesh.geometry.computeBoundingSphere();
	            meshes.push(mesh);
	        }
	    });
	    return meshes;
	}

	var THREE$4;
	var GLTFLoader$1;
	installer.addEventListener('install', function (libs) {
	    THREE$4 = libs.THREE;
	    GLTFLoader$1 = libs.GLTFLoader;
	});
	var LayoutGLTFObject = (function (_super) {
	    __extends(LayoutGLTFObject, _super);
	    function LayoutGLTFObject(el, url) {
	        var _this = _super.call(this, el, new THREE$4.Object3D()) || this;
	        var loader = new GLTFLoader$1();
	        loader.load(url, function (gltf) {
	            var _a, _b;
	            (_a = _this.object).add.apply(_a, gltf.scene.children);
	            (_b = _this.meshes).push.apply(_b, extractMeshes(_this.object));
	            var mixer = new THREE$4.AnimationMixer(_this.object);
	            var actions = gltf.animations.map(function (animation) { return mixer.clipAction(animation); });
	            if (actions.length >= 1) {
	                actions[0].play();
	                _this._mixer = mixer;
	                _this.animated = true;
	                var inView = isInView(_this.el);
	                if (inView.partIn || inView.wholeIn)
	                    _this.active = true;
	                inViewObserver.add({
	                    el: _this.el,
	                    onEnterStart: function () { return _this.active = true; },
	                    onEnterEnd: function () { return _this.active = true; },
	                    onLeaveEnd: function () { return _this.active = false; },
	                });
	            }
	            _this.dispatchEvent({ type: 'loaded' });
	        });
	        return _this;
	    }
	    LayoutGLTFObject.prototype.update = function (delta) {
	        if (this._mixer)
	            this._mixer.update(delta);
	    };
	    return LayoutGLTFObject;
	}(LayoutObject));

	exports.LayoutField = LayoutField;
	exports.LayoutGLTFObject = LayoutGLTFObject;
	exports.LayoutParticleImageObject = LayoutParticleImageObject;
	exports.install = install;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
