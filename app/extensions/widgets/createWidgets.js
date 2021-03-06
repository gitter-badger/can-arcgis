import dev from 'can-util/js/dev/dev';
import createEsriWidget from './createEsriWidget';
import createRendererWidget from './createRendererWidget';
import esriPromise from 'esri-promise';
import assign from 'can-util/js/assign/assign';

const DEFAULT_POSITION = 'top-left',
    DEFAULT_ICON = 'esri-icon-expand';

function addWidget (view, widget) {
    switch (widget.parent) {
    case 'expand': 
        // expand type widget. places a widget inside a expand wrapper that is toggle able and mobile friendly
        // https://developers.arcgis.com/javascript/latest/sample-code/widgets-expand/index.html
        esriPromise(['esri/widgets/Expand']).then(([Expand]) => {
            const expand = new Expand({

                // see https://developers.arcgis.com/javascript/latest/guide/esri-icon-font/
                expandIconClass: widget.iconClass || DEFAULT_ICON,
                view: view,
                content: widget.component
            });
                    
            view.ui.add({
                component: expand,
                position: widget.position || DEFAULT_POSITION,
                index: widget.index
            });
        });
        break;

    case 'view':
        if (!widget.component) { 
            dev.warn('createWidget::Widget not created, no component exists');
            return;
        }
        view.ui.add(widget); 
        break;
    default:
        dev.warn('createWidget::parent was not found');
    }
}

export default function createWidgets (options) {
    const promises = [];

    
    options.widgets.forEach((widgetConfig) => {

        switch (widgetConfig.type) {

        // esri types need to be imported and created using esriPromise
        case 'esri':
            promises.push(createEsriWidget(options.view, widgetConfig, addWidget));
            break;
        
        // renderers are a function that renders a stache template
        case 'renderer':
            createRendererWidget(options.view, widgetConfig, addWidget);
            break;

        // default is an object is constructed with the view parameter
        // eslint-disable-next-line
        default:
            if (!widgetConfig.Constructor) {
                dev.warn('createWidget::widget needs Constructor option if no type is provided');
                return;
            }
            const widget = new widgetConfig.Constructor(assign(widgetConfig.options, {
                view: options.view
            }));
            addWidget(options.view, assign(widgetConfig, {component: widget}));
        }

    });

    // return promises
    return promises;
}
