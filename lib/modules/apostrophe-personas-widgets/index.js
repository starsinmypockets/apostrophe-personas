var _ = require('lodash');

module.exports = {
  improve: 'apostrophe-widgets',
  beforeConstruct: function(self, options) {
    options.addFields = [
      {
        type: 'select',
        name: 'persona',
        // choices patched in later when personas module wakes up
        choices: [],
        contextual: true
      }
    ].concat(options.addFields || []);
    options.arrangeFields = [
      {
        name: 'persona',
        label: 'Persona',
        fields: [ 'persona' ]
      }
    ].concat(options.arrangeFields || []);
  },
  construct: function(self, options) {
    self.modulesReady = function() {
      self.setChoices();
    };
    self.setChoices = function() {
      var personas = self.apos.modules['apostrophe-personas'];
      var personaField = _.find(self.schema, { name: 'persona' });
      if (!personaField) {
        return;
      }
      personaField.choices = [
        {
          label: 'Universal',
          value: ''
        }
      ].concat(_.map(personas.personas, function(persona) {
        return {
          label: persona.label,
          value: persona.name
        };
      }));
    };
    var superGetWidgetClasses = self.getWidgetClasses;
    self.getWidgetClasses = function(widget) {
      if (!self.apos.areas.inPersona(self.apos.templates.contextReq, widget)) {
        return superGetWidgetClasses(widget);
      }
      return superGetWidgetClasses(widget).concat([ 'apos-area-widget-in-persona' ]);
    };

    // If a widget has a linkToPersona field in its schema, and
    // also a join field that joins withType apostrophe-page,
    // update the _url based on linkToPersona. Otherwise leave it
    // alone

    var superLoad = self.load;
    self.load = function(req, widgets, callback) {
      return superLoad(req, widgets, function(err) {
        if (err) {
          return callback(err);
        }
        if (!_.find(self.schema, { name: 'linkToPersona' })) {
          return callback(null);
        }
        var join = _.find(self.schema, function(field) {
          return field.type.match(/^join/);
        });
        if (!join) {
          console.error('schema has linkToPersona, but no join. Must be at same level.');
          return callback(null);
        }
        _.each(widgets, function(widget) {
          if (!widget.linkToPersona) {
            return;
          }
          if (widget[join.name]) {
            fixPersona(widget[join.name]);
          }
          function fixPersona(o) {
            var personas = self.apos.modules['apostrophe-personas'];
            _.each(o, function(val, key) {
              if (key === '_url') {
                o[key] = personas.addPrefix(req, widget.linkToPersona, val);
              }
              if ((typeof val) === 'object') {
                fixPersona(val);
              }
            });
          }
        });
        return callback(null);
      });
    };
  }
};
