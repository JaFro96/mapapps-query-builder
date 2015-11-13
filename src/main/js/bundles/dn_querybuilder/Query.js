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
    "dojo/json",
    "ct/store/Filter",
    "ct/_when",
    "./EditableQueryBuilderWidget"
], function (declare, JSON, Filter, ct_when, EditableQueryBuilderWidget) {
    return declare([], {
        // Surrounds a store with a Filter and fires a selection end event
        // If the result center is part of the app the store would be shown there
        // TODO: better integrate the filter code inside the SearchStoreTool of the result center?
        onQueryToolClicked: function (event) {
            var store = event.store;
            if (!store) {
                // ignore
                return;
            }
            var customquery = event.customquery;

            var topic = "ct/selection/SELECTION_END";
            if (event.options.editable === true) {
                var props = event._properties;
                var i18n = event._i18n.get();
                var tool = event.tool;
                var mapState = this._mapState;
                var dataModel = this._dataModel;
                var replacer = this._replacer;
                var logService = this._logService;
                var widget = this.widget = new EditableQueryBuilderWidget({
                    properties: props,
                    i18n: i18n.wizard,
                    tool: tool,
                    store: store,
                    mapState: mapState,
                    dataModel: dataModel,
                    replacer: replacer,
                    logService: logService
                });
                var window = this._windowManager.createWindow({
                    title: i18n.wizard.editWindowTitle,
                    marginBox: {
                        w: 550,
                        h: 274,
                        t: 100,
                        l: 20
                    },
                    content: widget,
                    closable: true,
                    resizable: true
                });
                window.show();
            } else {
                this._setProcessing(event.tool, true);
                var geom;
                if (customquery.geometry) {
                    geom = customquery.geometry;
                }
                var customQueryString = JSON.stringify(customquery);
                customQueryString = this._replacer.replace(customQueryString);
                customquery = JSON.parse(customQueryString);
                var geom;
                if (customquery.geometry) {
                    customquery["geometry"] = geom;
                }
                var options = {};
                var count = event.options.count;
                if (count >= 0) {
                    options.count = count;
                }
                options.ignoreCase = event.options.ignoreCase;
                options.locale = event.options.locale;
                /*this._eventService.postEvent(topic, {
                 source: this,
                 store: customquery ? Filter(store, customquery, options) : store
                 });*/

                var filter = new Filter(store, customquery, options);

                ct_when(filter.query({}, {count: 0}).total, function (total) {
                    if (total) {
                        this._dataModel.setDatasource(filter);
                        this._setProcessing(event.tool, false);
                    } else {
                        this._logService.warn({
                            id: 0,
                            message: this._i18n.get().wizard.no_results_error
                        });
                        this._setProcessing(event.tool, false);
                    }
                }, function (e) {
                    this._setProcessing(event.tool, false);
                    this._logService.warn({
                        id: e.code,
                        message: e
                    });
                }, this);
            }
        },
        _setProcessing: function (tool, processing) {
            if (tool) {
                tool.set("processing", processing);
            }
        }
    });
});
