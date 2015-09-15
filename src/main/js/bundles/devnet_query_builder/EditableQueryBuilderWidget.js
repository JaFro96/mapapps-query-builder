/*
 * Copyright (C) 2015 con terra GmbH (info@conterra.de)
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
define([
    "dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/_base/array",
    "dojo/on",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/text!./templates/EditableQueryBuilderWidget.html",
    "./config/FieldWidget",
    "dojo/_base/lang",
    "dojo/html",
    "dojo/store/Memory",
    "dijit/registry",
    "dijit/form/TextBox",
    "dijit/form/ValidationTextBox",
    "dijit/form/FilteringSelect",
    "dijit/form/Button",
    "dijit/layout/ContentPane",
    "dijit/layout/BorderContainer",
    "ct/async",
    "ct/_when",
    "ct/store/Filter",
    "ct/util/css"
], function (declare,
        domConstruct,
        d_array,
        on,
        _WidgetBase,
        _TemplatedMixin,
        _WidgetsInTemplateMixin,
        templateStringContent,
        FieldWidget,
        d_lang,
        d_html,
        Memory,
        d_registry,
        TextBox,
        ValidationTextBox,
        FilteringSelect,
        Button,
        ContentPane,
        BorderContainer,
        ct_async,
        ct_when,
        Filter,
        ct_css) {
    return declare([_WidgetBase, _TemplatedMixin,
        _WidgetsInTemplateMixin], {
        templateString: templateStringContent,
        baseClass: "editableQueryBuilderWizard",
        postCreate: function () {
            this.inherited(arguments);
        },
        startup: function () {
            this.inherited(arguments);
            var stores = [this.store];
            var storeData = this._getStoreData(stores);
            return ct_when(storeData, function (storeData) {
                this.storeData = storeData;
                this._init();
            }, this);
        },
        _init: function () {
            this.maxComboBoxHeight = 160;

            var store = new Memory({
                data: this.storeData
            });

            d_html.set(this._titleNode, this.properties.title);
            var storeId = this.store.id;
            var title = store.get(storeId).name;
            d_html.set(this._storeNode, title);

            var ynStore = this._ynStore = new Memory({
                data: [
                    {name: this.i18n.yes, id: "yes"},
                    {name: this.i18n.no, id: "no"}
                ]
            });
            this._extentSelect = new FilteringSelect({
                name: "extent",
                value: "no",
                store: ynStore,
                searchAttr: "name",
                style: "width: 155px;",
                required: true,
                maxHeight: this.maxComboBoxHeight,
                disabled: true
            }, this._extentNode);

            var matchStore = this._matchStore = new Memory({
                data: [
                    {name: this.i18n.and, id: "$and"},
                    {name: this.i18n.or, id: "$or"}
                ]
            });
            this._matchSelect = new FilteringSelect({
                name: "match",
                value: "$and",
                store: matchStore,
                searchAttr: "name",
                style: "width: 155px;",
                required: true,
                maxHeight: this.maxComboBoxHeight,
                disabled: true
            }, this._matchNode);

            this._createGUI(this.properties._wizardGUI);
        },
        resize: function (dim) {
            if (dim && dim.h > 0) {
                this._containerNode.resize({
                    w: dim.w,
                    h: dim.h
                });
            }
        },
        _setProcessing: function (processing) {
            var tool = this.tool;
            if (tool) {
                tool.set("processing", processing);
            }
        },
        _iconClassHelp: function () {
            var winURL = 'http://www.mapapps.de/mapapps/resources/jsregistry/root/themes/3.2.1/themes/webFontsGallery.html';
            var winName = 'win1';
            var winSize = 'width=800,height=600,scrollbars=yes';
            var ref = window.open(winURL, winName, winSize);
        },
        _changeExtentVisibility: function () {
            if (this._queryNode.children.length > 1) {
                ct_css.switchHidden(this._matchDiv, false);
            } else {
                ct_css.switchHidden(this._matchDiv, true);
            }
        },
        _getFields: function () {
            var store = this.store;
            var metadata = store.getMetadata();
            var fields = metadata.fields;
            var storeData = [];
            d_array.forEach(fields, function (field) {
                var codedValues = [];
                if (field.domain) {
                    codedValues = field.domain.codedValues;
                }
                var codedValueString = "";
                if (codedValues.length > 0) {
                    codedValueString = "[CV]";
                }
                if (field.type !== "geometry" && field.type !== "date") {
                    storeData.push({id: field.name, title: field.title + " (" + field.type + ") " + codedValueString, type: field.type, codedValues: codedValues});
                }
            });
            return storeData;
        },
        _addDataField: function (field) {
            var storeData = this._getFields();
            var fieldWidget = new FieldWidget({
                store: this.store,
                storeData: storeData,
                i18n: this.i18n.fields,
                fieldId: field.fieldId,
                compareId: field.compareId,
                value: field.value,
                type: "editing"
            });
            domConstruct.place(fieldWidget.domNode, this._queryNode, "last");
        },
        _getStoreData: function (stores) {
            return ct_async.join(d_array.map(stores, function (s) {
                return s.getMetadata();
            })).then(function (metadata) {
                return d_array.map(metadata, function (metadata, index) {
                    var id = stores[index].id;
                    var title = metadata.title || id;
                    return {name: title, id: id};
                });
            });
        },
        _createGUI: function (wizardGUI) {
            var match = wizardGUI.match;
            this._matchSelect.set("value", match);
            var extent = wizardGUI.extent;
            this._extentSelect.set("value", extent);
            var fields = wizardGUI.fields;
            d_array.forEach(fields, function (field) {
                this._addDataField(field);
            }, this);
        },
        _onDone: function () {
            this._setProcessing(true);
            var complexQuery = this._getComplexQuery();
            var store = this.store;
            var filter = new Filter(store, complexQuery, {ignoreCase: true});
            this.dataModel.setDatasource(filter);
            this._setProcessing(false);
        },
        _getComplexQuery: function () {
            var match = this._matchSelect.value;
            var customQuery = {};
            var extent;
            if (this._extentSelect.value === "yes") {
                extent = this.mapState.getExtent();
                customQuery.geometry = {
                    $contains: extent
                };
            } else {
            }
            var children = this._queryNode.children;
            if (children.length > 0)
            {
                customQuery[match] = [];
            }
            d_array.forEach(children, function (child) {
                var widget = d_registry.getEnclosingWidget(child);
                var fieldId = widget._getSelectedField().id;
                var compareId = widget._getSelectedCompare().id;
                var value = widget._getValue();
                switch (compareId) {
                    case "is":
                        var obj = {};
                        obj[fieldId] = {$eq: value};
                        customQuery[match].push(obj);
                        break;
                    case "is_not":
                        var obj = {};
                        obj[fieldId] = {$not: {$eq: value}};
                        customQuery[match].push(obj);
                        break;
                    case "contains":
                        var obj = {};
                        obj[fieldId] = {$eqw: "*" + value + "*"};
                        customQuery[match].push(obj);
                        break;
                    case "contains_not":
                        var obj = {};
                        obj[fieldId] = {$not: {$eqw: "*" + value + "*"}};
                        customQuery[match].push(obj);
                        break;
                    case "starts_with":
                        var obj = {};
                        obj[fieldId] = {$eqw: value + "*"};
                        customQuery[match].push(obj);
                        break;
                    case "ends_with":
                        var obj = {};
                        obj[fieldId] = {$eqw: "*" + value};
                        customQuery[match].push(obj);
                        break;
                    case "is_number":
                        var obj = {};
                        obj[fieldId] = {$eq: parseFloat(value)};
                        customQuery[match].push(obj);
                        break;
                    case "is_not_number":
                        var obj = {};
                        obj[fieldId] = {$not: {$eq: parseFloat(value)}};
                        customQuery[match].push(obj);
                        break;
                    case "is_greater_number":
                        var obj = {};
                        obj[fieldId] = {$gt: parseFloat(value)};
                        customQuery[match].push(obj);
                        break;
                    case "is_greater_or_equal_number":
                        var obj = {};
                        obj[fieldId] = {$gte: parseFloat(value)};
                        customQuery[match].push(obj);
                        break;
                    case "is_less_number":
                        var obj = {};
                        obj[fieldId] = {$lt: parseFloat(value)};
                        customQuery[match].push(obj);
                        break;
                    case "is_less_or_equal_number":
                        var obj = {};
                        obj[fieldId] = {$lte: parseFloat(value)};
                        customQuery[match].push(obj);
                        break;
                    default:

                }
            }, this);
            return customQuery;
        }
    });
});