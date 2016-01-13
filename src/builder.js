(function ($) {

    var utils = {

        DEBUGG: true,

        decorate_item: function (element) {
            return '<div class="col-md-12 avatar" data-toggle="popover">' + element + '</div>';
        },

        debug: function(message) {
            if( utils.DEBUGG )
                console.log(message);

            return utils;
        }
    };

    var view = {

        templates_path: '/dist/html/templates.htm',

        panels: {},

        templates: {},

        popovers: {},

        set_path: function (path) {
            this.templates_path = '/' + path
        },

        path: function (is_element) {
            return this.templates_path + (is_element ? 'elements/' : 'properties/');
        },

        load_html: function (callback) {
            $.get(view.templates_path).done(function (result) {
                $(result).find('div.panel').each(function () {
                    view.panels[$(this).data('id')] = $(this)[0].outerHTML;
                });

                $(result).find('div.template').each(function () {
                    view.templates[$(this).data('id')] = $(this).html();
                });

                $(result).find('div.popover').each(function () {
                    view.popovers[$(this).data('id')] = $(this).html();
                });

                utils.debug('Loaded html');

                _.isFunction(callback) ? callback.call(view) : false;
            });

            return this;
        },

        get_panel: function (panel_name, attributes) {
            var template = _.get(this.panels, panel_name, '');

            if( attributes ) {
                var tpl = _.template(_.unescape(template));

                attributes = _.merge(
                    $(template).data(),
                    attributes
                );

                utils.debug('Loaded Attributes ->');
                utils.debug(attributes);

                template = tpl(attributes);
            }

            return template;
        },

        get_template: function (template_name, attributes) {
            var template = _.get(this.templates, template_name, '');

            if( attributes ) {
                //todo temporary ..
                template = $('<div>'+template+'</div>');

                _.each(attributes, function(v, k) {
                    template.children().attr(k, v)
                });

                template = template.html();
            }

            return template;
        },

        get_popover: function (popover, attributes) {
            var template = _.get(this.popovers, popover, '');

            if( attributes ) {
                var tpl = _.template(_.unescape(template));

                attributes = _.merge(attributes, $(template).data());

                utils.debug('Loaded Attributes ->');
                utils.debug(attributes);

                template = tpl(attributes);
            }

            return template;
        }

    };

    var parser = {
        text: function(el) {
            var attributes = $(el).getAttributes();

            return attributes;
        },

        headline: function(el) {
            var attributes = $(el).getAttributes();

            attributes['text'] = $(el).text();

            return attributes;
        },

        paragraph: function(el) {
            return this.headline(el);
        },

        button: function(el) {
           return this.headline(el);
        },

        checkbox: function(el) {
            var attributes = $(el).getAttributes();

            attributes['text'] = $(el).find('label').text();

            attributes['name'] = $(el).find('input[type=checkbox]').attr('name');

            var options = [];
            $(el).find('input[type=checkbox]').each(function(k, v) {
                options[k] = $(v).getAttributes()
            });

            attributes['options'] = options;

            return attributes;
        }
    };

    var Panel = function (avatar, options) {

        var self = this;

        self.unique = new Date();

        self.avatar = avatar;

        self.options = options;

        self.events = {};

        self.panel_class = _.get(self.options, 'class', 'properties');

        var layout = '<div class="' + self.panel_class + '">%template%<div><p class="cancel">cancel</p><p class="save">save</p></div></div>';

        if ( _.has(self.options, 'properties.layout'))
            layout = _.get(self.options, 'properties.layout');

        self.set_layout = function (layout) {
            self.layout = layout;

            return self;
        };

        self.get_layout = function () {
            return self.layout;
        };

        self.set_layout(layout);


        self.open = function (parent) {
            if (self.is_opened())
                self.close();

            var template = self.get_template(false),
                parent = parent ? parent : (_.get(self.options, 'properties.parent', $('body')));

            var full_template = self.get_layout().replace('%template%', template);

            $(parent).append(full_template);

            var active_panel = $('.' + self.panel_class);

            active_panel.find('.cancel').on('click', function () {
                if (self.is_opened())
                    self.close();

                self.trigger('cancel', [self.avatar['element']]);
            });

            active_panel.find('.save').on('click', function () {
                var attributes = active_panel
                    .find(":input")
                    .serializeObject();

                self.trigger('save', [self.avatar['element'], attributes]);

                self.close();
            });
        };

        self.close = function () {
            $(document).find('.properties').remove();

            return self;
        };

        self.is_opened = function () {
            return $(document).find('.properties').length;
        };


        self.on = function (event, callback) {
            self.events[event] = callback;

            return self;
        };

        self.trigger = function (event, attributes) {
            var callback = _.get(self.events, event, function () {
            });

            callback.apply(self, attributes);

            return self;
        };


        self.get_avatar = function () {
            return self.avatar;
        };

        self.get_template = function (clean) {
            var avatar = self.get_avatar();
            var data = avatar.data;
            var attributes = avatar.getAttributes();

            return view.get_panel(
                _.get(data, 'panel', 'general'), (! clean) ? attributes : {}
            );
        };
    };

    var Avatar = function (element, data, options) {

        var self = this;

        self.unique = new Date();

        self.element = element;
        self.options = options;

        self.children = $(element).children();

        self.data       = data;

        if( parser.hasOwnProperty(data['type']) && ( typeof parser[data['type']] == 'function' ) ) {
            var function_name = data['type'];

            self.attributes = parser[function_name](self.children)
        } else {
            self.attributes = self.children.getAttributes();
        }

        self.panel = false;

        self.init = function() {
            var tooltip = _.get(self.options, 'tooltip');

            if( self.get_popover() ) {
                tooltip.content = $(self.get_popover());

                tooltip.content.find('.root').data({
                    avatar: self,
                    panel : self.get_panel()
                });
            }

            $(self.element).popover(tooltip)
                .on('show.bs.popover', function () {
                    $('[data-toggle=popover]').not( $(self.element) ).popover('hide');
                });
        };


        self.fillAttributes = function (attributes) {
            _.each(attributes, function (v, k) {
                self.attributes[k] = v;
            });

            $(self.element).data('avatar', self);

            return self;
        };

        self.getAttributes = function() {
            return self.attributes;
        };


        self.get_template = function () {
            var attributes = self.getAttributes();

            return view.get_template(
                _.get(self.data, 'type', 'text'), attributes
            );
        };

        self.get_popover = function() {
            var popover = view.get_popover(
                _.get(self.data, 'popover', 'general')
            );

            return popover;
        };

        self.get_panel = function () {
            if (!self.panel) {
                self.panel = new Panel(self, self.options)
            }

            return self.panel;
        };


        self.remove = function() {
            $(self.element).remove();

            return self;
        };

        self.render = function() {
            $(self.element).html(
                self.get_template()
            );

            return self;
        }
    };

    var Builder = function (elements, arguments) {

        var self = this;

        self.elements = elements;

        self.avatars = [];

        self.sortable_class = 'sortable';

        self.options = _.defaultsDeep(arguments, {
            elements: {},
            tooltip: {
                enabled: true,
                trigger: 'click',
                content: '<span class="edit">edit</span>',
                html: true,
                placement: 'top',
                container: 'body'
            }
        });

        self.init = function () {
            var box = {};

            $(self.elements).each(function() {
                var selector = $(this).data('container');

                if( _.has(box, selector) ) {
                    var container = _.get(box, selector);
                    container['elements'].push($(this))
                } else {
                    box[selector] = {
                        container: $('.' + selector),
                        elements: [$(this)]
                    }
                }
            });

            _.each(box, function(v, k) {
                var elements = $('[data-container='+k+']'),
                    container = v.container;

                //make it draggable
                elements.draggable({
                    revert: "invalid",
                    containment: "document",
                    helper: "clone",
                    cursor: "move"
                });

                container.find('.row').sortable({
                    revert: 10
                }).disableSelection();

                self.init_from_html(container);

                container.droppable({
                    accept: elements,
                    drop: function (event, ui) {
                        var html = view.get_template(
                            $(ui.draggable).data('type')
                        );

                        html = $(utils.decorate_item(html));

                        if (! container.find('.row').length) {
                            container.append('<div class="row " ' + self.sortable_class + '></div>');

                            container.find('.row').sortable({
                                revert: true
                            }).disableSelection();
                        }

                        var row = container.find('div.row');

                        row.append(html);

                        var avatar = self.add_avatar(
                            html,
                            $(ui.draggable).data()
                        );

                        html.data('avatar', avatar);

                        avatar.get_panel().close();

                        avatar.init();

                        html.trigger('click')
                    }
                });
            });
        };

        self.init_from_html = function(container) {
           $(container).find('.avatar').each(function () {
                var avatar = self.add_avatar(
                    this,
                    $(this).data()
                );

                $(this).data('avatar', avatar);

                avatar.init()
            });
        };

        self.add_avatars = function (avs) {
            _.each(avs, function (avatar) {
                self.add_avatar(avatar);
            });

            return self;
        };

        self.add_avatar = function (avatar, data) {
            var av = new Avatar(avatar, data, self.options);

            self.avatars.push(av);

            return av;
        };

        self.get_container = function() {
            return $(self.container);
        };

        self.save = function () {
        };
        self.load = function () {
        };
    };

    var methods = {
        init: function (options) {
            if(_.has(options, 'template_path') )
                view.set_path(
                    _.get(options, 'template_path')
                );

            var self = this;

            view.load_html(function() {
                (new Builder($(self), options))
                    .init()
            });

            return self;
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

    $.fn.getAttributes = function() {
        var attributes = {};

        if( this.length ) {
            $.each( this[0].attributes, function( index, attr ) {
                attributes[ attr.name ] = attr.value;
            } );
        }

        return attributes;
    };

})(jQuery);