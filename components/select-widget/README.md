# Select Widget

Query and select features, and perform actions on those selected features.

Each layer provided to the widget may be queried spatially (by default), or by by configuring attribute searches.

## Usage

```javascript
var layers = {
    'san_pipe': {

        // url to a feature layer
        url: `${assets}/8`,

        // an array of query objects
        queries: [{
            value: 'work_zone',
            label: 'Work Zone',
            fields: ['work_zone_number'],
            queryTemplate: `san_zone = 'SECTION {work_zone_number}'`
        }]
    },
};
```

A query object consists of 4 properties. 

 - `value`: a unique id for the query
 - `label`: a user friendly display to use in the query selection ui
 - `fields`: an array of field names or [field objects](#field-objects)
 - `queryTemplate`: a string that will be used to generate a definition query to send to the server. 

### Field Objects

A field object is optional, and may be a simple string which will result in a text field. If an object is provided, it may be any of the field properties that are used in [can-admin](https://github.com/roemhildtg/can-admin). For example, to configure a select dropdown, you may use the following:

```javascript
    fields: [{
        fieldType: 'select',
        options: [{
            label: 'Option label',
            value: 'field-value'
        }],
        alias: 'Custom field label',
        validate(props){
            //custom validate function
            if(!props.value){
                return 'This value is required'
            }
        }
    }]
```