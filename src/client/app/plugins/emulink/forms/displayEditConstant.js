/**
 * Displays edit window for constants.
 * @author Paolo Masci
 * @date 5/24/14 9:02:22 PM
 */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
define(function (require, exports, module) {
    "use strict";
    var d3 = require("d3/d3"),
        formTemplate = require("text!./templates/displayEditConstant.handlebars"),
        FormUtils = require("./FormUtils");

    var EditConstantView = Backbone.View.extend({
        initialize: function (data) {
            d3.select(this.el).attr("class", "overlay").style("top", self.scrollY + "px");
            this.render(data);
            this._data = data;
        },
        render: function (data) {
            var template = Handlebars.compile(formTemplate);
            this.$el.html(template(data));
            $("body").append(this.el);
            d3.select(this.el).select("#newConstantName").node().focus();
            return this;
        },
        events: {
            "click #btnRight": "right",
            "click #btnLeft": "left"
        },
        right: function (event) {
            var form = this.el;
            if (FormUtils.validateForm(form)) {
                var selectors = [ "newConstantName", "newConstantType", "newConstantValue" ];
                var formdata = FormUtils.serializeForm(form, selectors);
                this.trigger(this._data.buttons[1].toLowerCase().replace(new RegExp(" ", "g"), "_"),
                             {data: formdata, el: this.el}, this);
            }
        },
        left: function (event) {
            this.trigger(this._data.buttons[0].toLowerCase(), {el: this.el}, this);
        }
    });

    module.exports = {
        /**
         * @param {
         *    {header} form header
         *    {buttons} names for cancel and ok buttons
         * }
         */
        create: function (data) {
            return new EditConstantView(data);
        }
    };
});
