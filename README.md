# cosmodog-dl
*cosmodog-dl* is a factory for Data Models. 
The driving motivation behind this project is to separate library properties from data properties, allow for configurable service integrations, and internalize enforcement of data constraints.
We achieve this by using Symbols as keys for object meta data, allow callback hooks and configurable RESTful conventions for service integrations, and dynamically build ES5 Property Definitions based on a given JSON-Schema.
