(function ($) {

    var view = {

        templates_path: '/templates/',

        panels: {},

        templates: {},

        set_path: function(path) {
            this.templates_path = '/' + path
        },

        path: function(is_element) {
            return this.templates_path + (is_element ? 'elements/' : 'properties/');
        },

        load_html: function(url, callback) {
            $.get(url).done(function(data) {
                callback.call(view, data);
            });

            return this;
        },


        load_panels: function(callback) {
            var self = this;

            this.load_html(this.templates_path + 'panels.htm', function(result) {
                $(result).find('div.panel').each(function() {
                    self.panels[this.id] = $(this)[0].outerHTML;
                });

                _.isFunction(callback) ? callback.call(self, self.panels) : false;
            });

            return self;
        },

        load_templates: function(callback) {
            var self = this;

            this.load_html(self.templates_path + 'templates.htm', function(result) {
                $(result).find('script.template').each(function() {
                    self.templates[this.id] = $(this).html();
                });

                _.isFunction(callback) ? callback.call(self, self.templates) : false;
            });

            return self;
        },


        get_panel: function(panel_name) {
            return _.get(this.panels, panel_name, '');
        },

        get_template: function(template) {
            return _.get(this.templates, template, '');
        }
    };

    var Panel = function(el) {
        var self = this;

        self.element = el;

        self.events = {};

        self.panel_class = 'properties';

        self.open = function(parent) {
            if( self.is_opened() )
                self.close();

            var template = self.get_template(),
                footer = '<div><p class="cancel">cancel</p><p class="save">save</p></div>',
                parent = parent ? parent : $('body');

            $(parent).append('<div class="'+self.panel_class+'">' + template + footer + '</div>');

            var active_panel = $('.' + self.panel_class);

            active_panel.find('.cancel').on('click', function() {
                if( self.is_opened() )
                    self.close();

                self.trigger('cancel', [self.element]);
            });

            active_panel.find('.save').on('click', function() {
                var attributes = active_panel
                    .find(":input")
                    .serializeObject();

                self.trigger('save', [self.element['scope'], attributes]);

                self.close();
            });
        };

        self.close = function() {
            $(document).find('.properties').remove();

            return self;
        };

        self.is_opened = function() {
            return $(document).find('.properties').length;
        };


        self.on = function(event, callback) {
            self.events[event] = callback;

            return self;
        };

        self.trigger = function(event, attributes) {
            var callback = _.get(self.events, event, function() {});

            callback.apply(self, attributes);

            return self;
        };


        self.get_element = function() {
            return self.element;
        };

        self.get_template = function() {
            return self.get_element()
                .get_panel_template(false);
        };
    };

    var Avatar = function(element) {

        var self = this;

        self.element = element;
        self.attributes = _.get(element, 'attributes', {});

        self.panel = false;

        self.fill = function(attributes) {
            _.each(attributes, function(v, k) {
                self.attributes[k] = v;
            });

            return self;
        };

        self.get_template = function(clean) {
            var template = view.get_template(
                _.get(self.element, 'type', 'text')
            );

            if( ! clean ) {
                var tpl = _.template(_.unescape(template));

                var panel = self.get_panel_template(true),
                    panel_attributes = $(panel).data();

                var attributes = _.merge(panel_attributes, _.get(self, 'attributes', {}));

                template = tpl(attributes);
            }

            return template;
        };

        self.get_panel_template = function(clean) {
            var template = view.get_panel(
                _.get(self.element, 'panel', 'text')
            );

            if( ! clean ) {
                var tpl = _.template(_.unescape(template)),
                    panel_attributes = $(template).data();

                var attributes = _.merge(panel_attributes, _.get(self, 'attributes', {}));

                template = tpl(attributes);
            }

            return template;
        };

        self.get_attributes = function() {
            return _.get(self, 'attributes', {})
        };

        self.get_panel = function() {
            if(! self.panel) {
                self.panel = new Panel(self)
            }

            return self.panel;
        };
    };

    var Builder = function(container, draggable, arguments) {

        var self = this;

        self.draggable = draggable;

        self.elements = [];

        self.container = container;

        self.sortable_class = 'sortable';

        self.options = _.defaults(arguments, {
            elements: {}
        });

        self.init = function() {
            $( self.draggable ).draggable({
                revert: "invalid",
                containment: "document",
                helper: "clone",
                cursor: "move"
            });

            $(self.container).find('.avatar').each(function() {
                var data = $(this).data();
                var avatar = self.add_element(data);
                avatar.scope = $(this);
                $(this).data('avatar', avatar);

                $(this).on('click', function() {
                    var element = $(this),
                        avatar = element.data('avatar'),
                        panel = avatar.get_panel(true);

                    panel.on('save', function(ui, attributes) {
                        var avatar = $(ui).data('avatar');

                        avatar.fill(attributes);

                        $(ui).attr('class', attributes.size);
                        $(ui).html(avatar.get_template(false));

                        $(ui).data('avatar', avatar);
                    });

                    panel.open();
                });
            });

            $(self.container).find('.row').sortable({
                revert: true
            }).disableSelection();

            $( self.container ).droppable({
                accept: self.draggable,
                drop: function( event, ui ) {
                    var data = $(ui.draggable).data();

                    var avatar = self.add_element(data);

                    var element = $(self._decorate_item(
                        avatar.get_template(false))
                    );

                    if( ! self.container.find('.row').length ) {
                        self.container.append('<div class="row " ' + self.sortable_class + '></div>');

                        $( self.container ).find('.row').sortable({
                            revert: true
                        }).disableSelection();
                    }

                    var row = self.container.find('div.row');

                    avatar.scope = element;

                    element.data('avatar', avatar);

                    row.append(element);

                    element.on('click', function() {
                        var element = $(this),
                            avatar = element.data('avatar'),
                            panel = avatar.get_panel(true);

                        panel.on('save', function(ui, attributes) {
                            var avatar = $(ui).data('avatar');

                            avatar.fill(attributes);

                            $(ui).attr('class', attributes.size);
                            $(ui).html(avatar.get_template(false));

                            $(ui).data('avatar', avatar);
                        });

                        panel.open();
                    });

                    element.trigger('click');
                }
            });

            view.set_path(
                _.get(arguments, 'template_path', 'templates/')
            );

            view.load_templates().
                load_panels();
        };

        self.add_elements = function(els) {
            _.each(els, function(el) {
                 self.add_element(el);
            });

            return self;
        };

        self.add_element = function(el) {
            var attributes = _.get(el, 'attributes', {});

            var element = new Avatar(el);

            self.elements.push(element);

            return element;
        };

        self.save = function() {};
        self.load = function() {};

        self._decorate_item = function(element) {
            return '<div class="col-md-12 avatar">' + element + '</div>';
        };
    };

    var methods = {
        init: function (options) {
            return this.each(function () {
                var elements = _.get(options, 'elements', $('.elements li'));

                var builderObj = new Builder($(this), elements, options);

                builderObj.init()
            });
        }
    };

    $.fn.builder = function (arguments) {
        var method = _.get(arguments, 'method', 'init');

        if (methods[method]) {
            return methods[method].call(this, arguments);
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(object, arguments);
        } else {
            $.error('Invalid method ' + method + ' for jQuery.builder');
        }
    };

})(jQuery);