_u = _.noConflict();

(function ($) {

    var utils = {

        DEBUGG: false,

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

        renders: {
            attributes: function (template, attributes) {
                template = $(template);

                _u.each(attributes, function (v, k) {
                    template.attr(k, v)
                });

                utils.debug('Loaded Attributes ->');
                utils.debug(attributes);

                return template.outerHTML();
            },

            headline: function (template, attributes) {
                template = this.attributes(template, attributes);
                template = $(template);

                template.text(
                    _u.get(attributes, 'text')
                );

                return template.outerHTML();
            },

            paragraph: function (template, attributes) {
                template = this.attributes(template, attributes);
                template = $(template);

                template.text(
                    _u.get(attributes, 'text')
                );

                return template.outerHTML();
            },

            button: function (template, attributes) {
                template = this.attributes(template, attributes);
                template = $(template);

                template.text(
                    _u.get(attributes, 'text')
                );

                return template.outerHTML();
            },

            checkbox: function (template, attributes) {
                template = $(template);

                template.find('label').text(
                    _u.get(attributes, 'text')
                );

                if(_u.has(attributes, 'options')) {
                    var options = _u.get(attributes, 'options');

                    template.find('div.checkboxes').html('');

                    _u.each(options, function(v) {
                        template.find('div.checkboxes').append('<input type="checkbox" name="'+attributes.name+'" value="'+v.value+'" checked="checked" />'+v.value+'<br />')
                    });
                }

                return template.outerHTML();
            },

            radio: function (template, attributes) {
                template = $(template);

                template.find('label').text(
                    _u.get(attributes, 'text')
                );

                if(_u.has(attributes, 'options')) {
                    var options = _u.get(attributes, 'options');

                    template.find('div.radio').html('');

                    _u.each(options, function(v) {
                        template.find('div.radio').append('<input type="radio" name="'+attributes.name+'" value="'+v.value+'" checked="checked" />'+v.value+'<br />')
                    });
                }

                return template.outerHTML();
            },

            select: function (template, attributes) {
                template = $(template);

                template.find('label').text(
                    _u.get(attributes, 'text')
                );

                if(_u.has(attributes, 'options')) {
                    var options = _u.get(attributes, 'options');

                    template.find('select').html('');
                    template.find('select').attr('name', _u.get(attributes, 'name', 'select'));

                    _u.each(options, function(v) {
                        template.find('select').append('<option value="'+v.value+'">'+v.value+'</option>')
                    });
                }

                return template.outerHTML();
            }
        },

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

                _u.isFunction(callback) ? callback.call(view) : false;
            });

            return this;
        },

        get_panel: function (panel_name, attributes) {
            var template = _u.get(this.panels, panel_name, '');

            if( attributes ) {
                var tpl = _u.template(_u.unescape(template));

                attributes = _u.merge(
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
            var template = _u.get(this.templates, template_name, '');

            if( attributes ) {
                if( _u.has(view.renders, template_name) ) {
                    template = view.renders[template_name](template, attributes)
                } else {
                    template = view.renders['attributes'](template, attributes)
                }
            }

            return template;
        },

        get_popover: function (popover, attributes) {
            var template = _u.get(this.popovers, popover, '');

            if( attributes ) {
                var tpl = _u.template(_u.unescape(template));

                attributes = _u.merge(attributes, $(template).data());

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
        },

        select: function(el) {
            var attributes = this.checkbox(el);

            attributes['name'] = $(el).find('select').attr('name');

            var options = [];
            $(el).find('select option').each(function(k, v) {
                options[k] = $(v).getAttributes()
            });

            attributes['options'] = options;

            return attributes;
        },

        radio: function(el) {
            var attributes = this.checkbox(el);

            attributes['name'] = $(el).find('input[type=radio]').attr('name');

            var options = [];
            $(el).find('input[type=radio]').each(function(k, v) {
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

        self.panel_class = _u.get(self.options, 'class', 'properties');

        var layout = '<div class="' + self.panel_class + '">%template%<div><p class="cancel">cancel</p><p class="save">save</p></div></div>';

        if ( _u.has(self.options, 'properties.layout'))
            layout = _u.get(self.options, 'properties.layout');

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
                parent = parent ? parent : (_u.get(self.options, 'properties.parent', $('body')));

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
            var callback = _u.get(self.events, event, function () {
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
                _u.get(data, 'panel', 'general'), (! clean) ? attributes : {}
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

            self.attributes = parser[function_name](self.children);
        } else {
            self.attributes = self.children.getAttributes();
        }

        self.panel = false;

        self.init = function() {
            var editor = _u.get(
                    self.options['editors'],
                    _u.get(self.data, 'editor', 'tooltip')
                ),
                popover = self.get_popover();

            editor.init(self, popover, editor);
        };

        self.fillAttributes = function (attributes) {
            _u.each(attributes, function (v, k) {
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
                _u.get(self.data, 'type', 'text'), attributes
            );
        };

        self.get_popover = function() {
            var popover = view.get_popover(
                _u.get(self.data, 'popover', 'general')
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

        self.options = _u.defaultsDeep(arguments, {
            elements: {},
            editors: {
                tooltip: {
                    enabled: true,
                    trigger: 'click',
                    content: '<span class="edit">edit</span>',
                    html: true,
                    placement: 'top',
                    container: 'body'
                },
                medium: {
                    disableEditing: false,
                    toolbar: {
                        buttons: ['bold', 'italic', 'underline', 'h2', 'h3']
                    }
                }
            }
        });

        self.init = function () {
            var box = {};

            $(self.elements).each(function() {
                var selector = $(this).data('container');

                if( _u.has(box, selector) ) {
                    var container = _u.get(box, selector);
                    container['elements'].push($(this))
                } else {
                    if( _u.has(self.options, 'finder') ) {
                        var container = self.options['finder'](selector, this);
                    } else {
                        var container = $('.' + selector);
                    }

                    box[selector] = {
                        container: container,
                        elements: [$(this)]
                    }
                }
            });

            _u.each(box, function(v, k) {
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
            _u.each(avs, function (avatar) {
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
            if(_u.has(options, 'template_path') )
                view.set_path(
                    _u.get(options, 'template_path')
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
        var method = _u.get(arguments, 'method', 'init');

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

    if (!$.outerHTML) {
        $.extend({
            outerHTML: function(ele) {
                var $return = undefined;
                if (ele.length === 1) {
                    $return = ele[0].outerHTML;
                }
                else if (ele.length > 1) {
                    $return = {};
                    ele.each(function(i) {
                        $return[i] = $(this)[0].outerHTML;
                    })
                };

                return $return;
            }
        });
        $.fn.extend({
            outerHTML: function() {
                return $.outerHTML($(this));
            }
        });
    }

})(jQuery);