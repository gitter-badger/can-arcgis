import DefineMap from 'can-define/map/map';
import mapImage from './util/identifyMapImage';
import dev from 'can-util/js/dev/dev';
import get from 'can-util/js/get/get';
import assign from 'can-util/js/assign/assign';
import stache from 'can-stache';
import esriPromise from 'esri-promise';

function defaultContent (data) {
    const node = document.createElement('div');
    node.appendChild(stache('<property-table vm:object:from="graphic.attributes" />')(data));
    return node;
}

const methods = {
    'esri.layers.MapImageLayer': mapImage
};


// asynchronously load the geometry engine
let geometryEngine;
esriPromise(['esri/geometry/geometryEngine']).then(([engine]) => {
    geometryEngine = engine;
});

/**
 * identify class
 * performs identify on additional layers, like map image
 * usage: new Identify(properties)
 */
export default DefineMap.extend({
    clickHandle: '*',
    layerInfos: DefineMap,
    view: {
        type: '*',
        set (view) {
            
            // cleanup click handle 
            if (this.clickHandle) {
                this.clickHandle.remove();
            }

            // register click handle
            if (view) {
                this.clickHandle = view.on('click', this.identify.bind(this));
            }

            return view;
            
        }
    }, 
    identify (event) {
        this.view.popup.features = [];

        // map existing popup promises to es6 promises
        const promises = this.view.popup.promises.map((p) => {
            return new Promise((resolve) => {
                p.then(resolve);
            });
        });

        // for each layer, idenitify it, and push a promise
        this.view.map.layers.forEach((layer) => {
            if (!layer.visible) {
                return;
            }
            if (methods.hasOwnProperty(layer.declaredClass)) {

                // get a promise that should resolve to some identify result
                const _promise = methods[layer.declaredClass](event, this.view, layer, this.layerInfos);

                const promise = new Promise((resolve) => {
                    _promise.then((result) => {
                        resolve({
                            result: result,
                            layerId: layer.id
                        });
                    });
                });
                promises.push(promise);
            } else {
                dev.warn(`no identify function registered for type ${layer.declaredClass}`);
            }
        });

        setTimeout(() => {
        // after all promises resolve, update the popup
            Promise.all(promises).then((data) => {

            // reduce and sort to a plain array of features
                const identifiedFeatures = data.reduce((a, b) => { 
                    return a.concat(this.assignPopupTemplate(b)); 
                }, [])
            
                    // sort according to distance from map click
                    .sort((a, b) => {
                        const geoms = [a, b].map((f) => {
                            return f.geometry.extent ? f.geometry.extent.center : f.geometry;
                        });
                        const distances = geoms.map((geom, index) => {
                            return geometryEngine.distance(event.mapPoint, geoms[index], 'feet');
                        });
                        const ret = distances[0] < distances[1] ? -1 : distances[0] > distances[1] ? 1 : 0;
                        return ret;
                    });

                // concat with graphics already in the popup
                const features = this.view.popup.features.concat(identifiedFeatures);

                // open the popup with the given features
                this.view.popup.open({
                    selectedFeatureIndex: 0,
                    features: features,
                    updateLocationEnabled: true
                });
            });
        }, 500);
    },
    assignPopupTemplate (data) {
        const {layerId, result} = data;
        return result.results ? result.results.map((props) => {

            // get a default popup template from popupTemplates.layerId.sublayerId
            const template = get(this, `popupTemplates.${layerId}.${props.layerId}`) || {};

            // mixin props
            props.feature.popupTemplate = assign({
                title: props.layerName,
                content: defaultContent
            }, template.serialize ? template.serialize() : template);

            // return the modified feature
            return props.feature;
        }) : [];
        
    }
});