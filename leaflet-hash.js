(function(window) {
    var HAS_HASHCHANGE = (function() {
        var doc_mode = window.documentMode;
        return ('onhashchange' in window) &&
            (doc_mode === undefined || doc_mode > 7);
    })();
    
    L.Hash = function(map, lc) {
        this.onHashChange = L.Util.bind(this.onHashChange, this);
    
        if (map && lc){
            this.init(map, lc);
        }else if (map) {
            this.init(map);
        }
    };
    
    L.Hash.prototype = {
        map: null,
        lastHash: null,
        lc: null,
    
        parseHash: function(hash) {
            if(hash.indexOf('#') == 0) {
                hash = hash.substr(1);
            }
            var args = hash.split("/");
            if (args.length >= 3) {
                var zoom = parseInt(args[0], 10),
                    lat = parseFloat(args[1]),
                    lon = parseFloat(args[2]);
                if (isNaN(zoom) || isNaN(lat) || isNaN(lon)) {
                    return false;
                } else if (args.length == 3){
                    return {
                        center: new L.LatLng(lat, lon),
                        zoom: zoom
                    };
                } else {
                    if(args.length == 4){
                        this.parseLayer(args[3]);
                    } else{
                        this.parseLayer(args[3], args[4]);
                    }
                    return {
                        center: new L.LatLng(lat, lon),
                        zoom: zoom
                    };
                }
            } else {
                return false;
            }
        },
    
        formatHash: function(map) {
            var center = map.getCenter(),
                zoom = map.getZoom(),
                precision = Math.max(0, Math.ceil(Math.log(zoom) / Math.LN2));

            var hashArray = [zoom,
                center.lat.toFixed(precision),
                center.lng.toFixed(precision)
            ];
            if (this.lc){
                var layers = this.onLayerChange(this.lc, this.map);
                hashArray.push(layers.base);
                hashArray.push(layers.overlay.join("-"))
            }
            return "#" + hashArray.join("/");
        },
    
        init: function(map, lc) {
            this.map = map;
            if(lc){
                this.lc = lc;
                this.map.on("layeradd layerremove", this.onMapMove, this);
            }
            this.map.on("moveend", this.onMapMove, this);
            
            // reset the hash
            this.lastHash = null;
            this.onHashChange();
            this.update();
    
            if (!this.isListening) {
                this.startListening();
            }
        },
    
        remove: function() {
            this.map = null;
            if (this.isListening) {
                this.stopListening();
            }
        },
        
        onMapMove: function(map) {
            // bail if we're moving the map (updating from a hash),
            // or if the map has no zoom set
            
            if (this.movingMap || this.map.getZoom() === 0) {
                return false;
            }
            
            var hash = this.formatHash(this.map);
            if (this.lastHash != hash) {
                location.replace(hash);
                this.lastHash = hash;
            }
        },
    
        movingMap: false,
        update: function() {
            var hash = location.hash;
            if (hash === this.lastHash) {
                console.info(hash+"!"+this.lastHash);
                return;
            }
            var parsed = this.parseHash(hash);
            if (parsed) {
                console.log("parsed:", parsed.zoom, parsed.center.toString());
                this.movingMap = true;
                
                this.map.setView(parsed.center, parsed.zoom);
                
                this.movingMap = false;
            } else {
                console.warn("parse error; resetting:", this.map.getCenter(), this.map.getZoom());
                this.onMapMove(this.map);
            }
        },
    
        // defer hash change updates every 100ms
        changeDefer: 100,
        changeTimeout: null,
        onHashChange: function() {
            // throttle calls to update() so that they only happen every
            // `changeDefer` ms
            if (!this.changeTimeout) {
                var that = this;
                this.changeTimeout = setTimeout(function() {
                    that.update();
                    that.changeTimeout = null;
                }, this.changeDefer);
            }
        },
    
        isListening: false,
        hashChangeInterval: null,
        startListening: function() {
            if (HAS_HASHCHANGE) {
                L.DomEvent.addListener(window, "hashchange", this.onHashChange);
            } else {
                clearInterval(this.hashChangeInterval);
                this.hashChangeInterval = setInterval(this.onHashChange, 50);
            }
            this.isListening = true;
        },
    
        stopListening: function() {
            if (HAS_HASHCHANGE) {
                L.DomEvent.removeListener(window, "hashchange", this.onHashChange);
            } else {
                clearInterval(this.hashChangeInterval);
            }
            this.isListening = false;
        },
        onLayerChange: function(layerControl, map) {
			var base, cLayers, key, overlay;
			cLayers = layerControl._layers;
			overlay = [];
			base = [];
			for (key in cLayers) {
				if (cLayers[key].layer._leaflet_id && cLayers[key].layer._leaflet_id in map._layers) {
					if (cLayers[key].overlay) {
						overlay.push(encodeURIComponent(cLayers[key].name));
					} else {
						base.push(encodeURIComponent(cLayers[key].name));
					}
				}
			}
			return {
				overlay: overlay,
				base: base[0]
			};
		},
		parseLayer: function(base, over){
			var bName = decodeURIComponent(base);
			if(over){
				this.parseOver(over);
			}
			var len = lc._baseLayersList.childNodes.length;
			for(var i = 0; i<len; i++){
					eachNode(lc._baseLayersList.childNodes[i]);
			}
				function eachNode(v){
				var parts = v.childNodes;
				var name = parts[1].data.slice(1)
				if(bName === name){
					parts[0].setAttribute("checked", "checked")
				}
			}
			lc._onInputClick();
		},
		parseOver: function(over){
			if(over.indexOf("-")>=0){
			var oArray = over.split("-");
			}else{
				var oArray = [over]
			}
			var lc = this.lc;
			oArray.forEach(function(oPart){
				var bName = decodeURIComponent(oPart);
				var len = lc._overlaysList.childNodes.length;
				for(var i = 0; i<len; i++){
					eachNode(lc._overlaysList.childNodes[i]);
				}
				function eachNode(v){
				var parts = v.childNodes;
				var name = parts[1].data.slice(1)
				if(bName === name){
					parts[0].checked = true;
				}else{
					parts[0].checked = false;
				}
			}
			});
			lc._onInputClick();
		}
    };
    L.hash = function(map, lc){
    	if(lc){
    		return new L.Hash(map, lc);
    	}else{
    		return new L.Hash(map);
    	}
        	
    };
    L.Map.prototype.addHash = function(lc){
    	if(lc){
    		L.hash(this, lc);
    	}else{
		L.hash(this);
    	}
	};
})(window);