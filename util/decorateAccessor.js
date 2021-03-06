import canSymbol from 'can-symbol';
import observation from 'can-observation';
import isContainer from 'can-util/js/is-container/is-container';
import canBatch from 'can-event/batch/batch';

function get (obj, name) {
    // The parts of the name we are looking up
    // `['App','Models','Recipe']`
    var parts = typeof name !== 'undefined' ? (String(name))
            .replace(/\[/g, '.')
            .replace(/]/g, '')
            .split('.') : [],
        length = parts.length,
        current, i, container;

    if (!length) {
        return obj;
    }

    current = obj;

    // Walk current to the 2nd to last object or until there
    // is not a container.
    for (i = 0; i < length && isContainer(current); i++) {
        container = current;
        const key = parts[i];
        observation.add(obj, key);
        current = container[key];
    }

    return current;
}

/**
 * Decorate esri's observable type with canjs methods
 * @param {esri/core/Accessor} obj the current object being accessed
 * @param {esri/core/Accessor} parent the root parent accessor object
 * @param {String} path the path to the value of the object from the parent
 * @returns {esri/core/Accessor} the decorated object or the value if `obj` is not an object
 */
export default function decorate (obj, parent = null, path = null) {
    
    // make sure object exists and isn't already decorated through circular references
    if (!obj || !obj.__accessor__ || obj[canSymbol.for('can.onKeyValue')]) {
        return obj;
    }
        
    const handlers = {
    };
    obj[canSymbol.for('can.isMapLike')] = true;

    // when a value gets unbound, remove its watch handle and the handler
    obj[canSymbol.for('can.offKeyValue')] = function (key, handle) {
        if (!handlers[key]) {
            handlers[key] = [];
        }
    
        const handler = handlers[key];
        if (handler) {
            // remove the handler
            const index = handler.handlers.indexOf(handle);
            handler.handlers.splice(index, 1);
        }

        // clean up the watch handle if no handlers
        if (!handler.handlers.length) {
            handler.watch.remove();
            handler.watch = null;
        }
    };

    // when a value gets bound, register its handler using `watch`
    obj[canSymbol.for('can.onKeyValue')] = function (key, handler) {
        
        if (!handlers[key]) {
            handlers[key] = {
                watch: null,
                handlers: []
            };
        }

        // register one single watcher
        if (!handlers[key].watch) {
            const watchProp = path ? `${path}.${key}` : key;
            handlers[key].watch = (parent || obj).watch(watchProp, (newValue, oldValue, propertyName, target) => {
                canBatch.start();
                handlers[key].handlers.forEach((handle) => {
                    handle.call(newValue, oldValue);
                });
                canBatch.stop();
            });
        }
            
        // push the handler into the stack
        handlers[key].handlers.push(handler);
    };
    
    // when a value is gotten, call observation.add
    obj[canSymbol.for('can.getKeyValue')] = function (key) {
        const fullPath = path ? `${path}.${key}` : key;
        observation.add(obj, key);
        return fullPath.indexOf('.') > -1 ? get(parent || obj, fullPath) : obj[key];
    };
    
    // decorate child keys
    obj.keys().forEach((key) => {
        const fullPath = path ? `${path}.${key}` : key;
        decorate(obj[key], (parent || obj), fullPath);
    }); 
        
    return obj;
}