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

        get_panel: function (panel_name) {
            return _.get(this.panels, panel_name, '');
        },

        get_template: function (template) {
            return _.get(this.templates, template, '');
        },

        get_popover: function (popover) {
            return _.get(this.popovers, popover, '');
        }
    };

    var Panel = function (avatar, options) {

        var self = this;

        self.avatar = avatar;

        self.options = options;

        self.events = {};

        self.panel_class = _.get(self.options, 'class', 'properties');

        var layout = '<div class="' + self.panel_class + '">%template%<div><p class="cancel">cancel</p><p class="save">save</p></div></div>';

        if (_.has(self.options, 'properties.layout'))
            layout = _.get(self.options, 'properties.layout')

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

            var template = self.get_template(),
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

        self.get_template = function () {
            return self.get_avatar()
                .get_panel_template(false);
        };
    };

    var Avatar = function (element, options) {

        var self = this;

        self.unique = new Date();

        self.element = element;
        self.options = options;
        self.attributes = $(element).data();

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

            self.get_element().popover(tooltip)
                .on('show.bs.popover', function () {
                    $('[data-toggle=popover]').not( $(self.element) ).popover('hide');
                });
        };

        self.fill = function (attributes) {
            _.each(attributes, function (v, k) {
                self.attributes[k] = v;
            });

            return self;
        };

        self.get_template = function (clean) {
            var template = view.get_template(
                _.get(self.attributes, 'type', 'text')
            );

            if (!clean) {
                var tpl = _.template(_.unescape(template));

                var panel = self.get_panel_template(true),
                    panel_attributes = $(panel).data();

                var attributes = _.merge(panel_attributes, _.get(self, 'attributes', {}));

                template = tpl(attributes);
            }

            return template;
        };

        self.get_panel_template = function (clean) {
            var panel = view.get_panel(
                _.get(self.attributes, 'panel', 'general')
            );

            if (!clean) {
                var tpl = _.template(_.unescape(panel));

                var attributes = $(panel).data();

                utils.debug('Loaded Attributes ->');
                utils.debug(attributes);

                attributes = _.merge(attributes, self.attributes);

                panel = tpl(attributes);
            }

            return panel;
        };

        self.get_element = function() {
            return $(self.element);
        };

        self.get_popover = function() {
            var popover = view.get_popover(
                _.get(self.attributes, 'popover', 'text')
            );

            return popover;
        };

        self.get_panel = function () {
            if (!self.panel) {
                self.panel = new Panel(self, self.options)
            }

            return self.panel;
        };
    };

    var Builder = function (container, draggable, arguments) {

        var self = this;

        self.draggable = draggable;

        self.elements = [];

        self.container = container;

        self.sortable_class = 'sortable';

        self.options = _.defaultsDeep(arguments, {
            elements: {},
            tooltip: {
                enabled: false,
                trigger: 'click',
                content: '<span class="edit">edit</span>',
                html: true,
                placement: 'top',
                container: 'body'
            }
        });

        self.init = function () {

            $(self.draggable).draggable({
                revert: "invalid",
                containment: "document",
                helper: "clone",
                cursor: "move"
            });

            self.init_from_html();

            self.get_container().find('.row').sortable({
                revert: true
            }).disableSelection();

            self.get_container().droppable({
                accept: self.draggable,
                drop: function (event, ui) {
                    var avatar = self.add_element(
                        $(ui.draggable).clone()
                    );

                    var element = $(utils.decorate_item(
                        avatar.get_template(false))
                    );

                    if (! self.container.find('.row').length) {
                        self.container.append('<div class="row " ' + self.sortable_class + '></div>');

                        $(self.container).find('.row').sortable({
                            revert: true
                        }).disableSelection();
                    }

                    var row = self.container.find('div.row');

                    row.append(element);

                    avatar.element = element;

                    element.data('avatar', avatar);

                    avatar.get_panel().close();

                    avatar.init();

                    element.trigger('click')
                }
            });
        };

        self.init_from_html = function() {
            self.get_container().find('.avatar').each(function () {
                var avatar = self.add_element(this);

                $(this).data('avatar', avatar);

                avatar.init()
            });
        };

        self.add_elements = function (els) {
            _.each(els, function (el) {
                self.add_element(el);
            });

            return self;
        };

        self.add_element = function (el) {
            var element = new Avatar(el, self.options);

            self.elements.push(element);

            return element;
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
                self.each(function () {
                    var elements = _.get(options, 'elements', $('.elements li'));

                    var builderObj = new Builder($(this), elements, options);

                    builderObj.init()
                });
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

})(jQuery);