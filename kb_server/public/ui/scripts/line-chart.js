var directive, m, mod, old_m, __indexOf = [].indexOf || function(item) {
    for (var i = 0, l = this.length; l > i; i++) if (i in this && this[i] === item) return i;
    return -1;
};

old_m = angular.module("n3-charts.linechart", [ "n3charts.utils" ]), m = angular.module("n3-line-chart", [ "n3charts.utils" ]), 
directive = function(name, conf) {
    return old_m.directive(name, conf), m.directive(name, conf);
}, directive("linechart", [ "n3utils", "$window", "$timeout", function(n3utils, $window, $timeout) {
    var link;
    return link = function(scope, element, attrs, ctrl) {
        var dispatch, id, initialHandlers, isUpdatingOptions, promise, updateEvents, window_resize, _u;
        _u = n3utils, dispatch = _u.getEventDispatcher(), id = _u.uuid(), element[0].style["font-size"] = 0, 
        scope.redraw = function() {
            scope.update();
        }, isUpdatingOptions = !1, initialHandlers = {
            onSeriesVisibilityChange: function(_arg) {
                var index, newVisibility, series;
                return series = _arg.series, index = _arg.index, newVisibility = _arg.newVisibility, 
                scope.options.series[index].visible = newVisibility, scope.$apply();
            }
        }, scope.update = function() {
            var axes, columnWidth, dataPerSeries, dimensions, fn, handlers, isThumbnail, options, svg;
            return options = _u.sanitizeOptions(scope.options, attrs.mode), handlers = angular.extend(initialHandlers, _u.getTooltipHandlers(options)), 
            dataPerSeries = _u.getDataPerSeries(scope.data, options), dimensions = _u.getDimensions(options, element, attrs), 
            isThumbnail = "thumbnail" === attrs.mode, _u.clean(element[0]), svg = _u.bootstrap(element[0], id, dimensions), 
            fn = function(key) {
                return options.series.filter(function(s) {
                    return s.axis === key && s.visible !== !1;
                }).length > 0;
            }, axes = _u.createAxes(svg, dimensions, options.axes).andAddThemIf({
                all: !isThumbnail,
                x: !0,
                y: fn("y"),
                y2: fn("y2")
            }), dataPerSeries.length && _u.setScalesDomain(axes, scope.data, options.series, svg, options), 
            _u.createContent(svg, id, options, handlers), dataPerSeries.length && (columnWidth = _u.getBestColumnWidth(axes, dimensions, dataPerSeries, options), 
            _u.drawData(svg, dimensions, axes, dataPerSeries, columnWidth, options, handlers, dispatch)), 
            options.drawLegend && _u.drawLegend(svg, options.series, dimensions, handlers, dispatch), 
            "scrubber" === options.tooltip.mode ? _u.createGlass(svg, dimensions, handlers, axes, dataPerSeries, options, dispatch, columnWidth) : "none" !== options.tooltip.mode && _u.addTooltips(svg, dimensions, options.axes), 
            _u.createFocus(svg, dimensions, options), _u.setZoom(svg, dimensions, axes, dataPerSeries, columnWidth, options, handlers, dispatch);
        }, updateEvents = function() {
            return scope.oldclick ? dispatch.on("click", scope.oldclick) : scope.click ? dispatch.on("click", scope.click) : dispatch.on("click", null), 
            scope.oldhover ? dispatch.on("hover", scope.oldhover) : scope.hover ? dispatch.on("hover", scope.hover) : dispatch.on("hover", null), 
            scope.mouseenter ? dispatch.on("mouseenter", scope.mouseenter) : dispatch.on("mouseenter", null), 
            scope.mouseover ? dispatch.on("mouseover", scope.mouseover) : dispatch.on("mouseover", null), 
            scope.mouseout ? dispatch.on("mouseout", scope.mouseout) : dispatch.on("mouseout", null), 
            scope.oldfocus ? dispatch.on("focus", scope.oldfocus) : scope.focus ? dispatch.on("focus", scope.focus) : dispatch.on("focus", null), 
            scope.toggle ? dispatch.on("toggle", scope.toggle) : dispatch.on("toggle", null);
        }, promise = void 0, window_resize = function() {
            return null != promise && $timeout.cancel(promise), promise = $timeout(scope.redraw, 1);
        }, $window.addEventListener("resize", window_resize), scope.$watch("data", scope.redraw, !0), 
        scope.$watch("options", scope.redraw, !0), scope.$watchCollection("[click, hover, focus, toggle]", updateEvents), 
        scope.$watchCollection("[mouseenter, mouseover, mouseout]", updateEvents), scope.$watchCollection("[oldclick, oldhover, oldfocus]", updateEvents), 
        scope.$on("$destroy", function() {
            return $window.removeEventListener("resize", window_resize);
        });
    }, {
        replace: !0,
        restrict: "E",
        scope: {
            data: "=",
            options: "=",
            oldclick: "=click",
            oldhover: "=hover",
            oldfocus: "=focus",
            click: "=onClick",
            hover: "=onHover",
            focus: "=onFocus",
            toggle: "=onToggle",
            mouseenter: "=onMouseenter",
            mouseover: "=onMouseover",
            mouseout: "=onMouseout"
        },
        template: "<div></div>",
        link: link
    };
} ]), mod = angular.module("n3charts.utils", []), mod.factory("n3utils", [ "$window", "$log", "$rootScope", function($window, $log, $rootScope) {
    return {
        addPatterns: function(svg, series) {
            var pattern;
            return pattern = svg.select("defs").selectAll("pattern").data(series.filter(function(s) {
                return s.striped;
            })).enter().append("pattern").attr({
                id: function(s) {
                    return s.type + "Pattern_" + s.index;
                },
                patternUnits: "userSpaceOnUse",
                x: 0,
                y: 0,
                width: 60,
                height: 60
            }).append("g").style({
                fill: function(s) {
                    return s.color;
                },
                "fill-opacity": .9
            }), pattern.append("rect").style("fill-opacity", .9).attr("width", 60).attr("height", 60), 
            pattern.append("path").attr("d", "M 10 0 l10 0 l -20 20 l 0 -10 z"), pattern.append("path").attr("d", "M40 0 l10 0 l-50 50 l0 -10 z"), 
            pattern.append("path").attr("d", "M60 10 l0 10 l-40 40 l-10 0 z"), pattern.append("path").attr("d", "M60 40 l0 10 l-10 10 l -10 0 z");
        },
        drawArea: function(svg, scales, data, options) {
            var areaGroup, areaJoin, areaSeries, drawers;
            return areaSeries = data.filter(function(series) {
                return "area" === series.type;
            }), this.addPatterns(svg, areaSeries), drawers = {
                y: this.createLeftAreaDrawer(scales, options.lineMode, options.tension),
                y2: this.createRightAreaDrawer(scales, options.lineMode, options.tension)
            }, areaJoin = svg.select(".content").selectAll(".areaGroup").data(areaSeries), areaGroup = areaJoin.enter().append("g").attr("class", function(s) {
                return "areaGroup series_" + s.index;
            }), areaJoin.each(function(series) {
                var dataJoin;
                return dataJoin = d3.select(this).selectAll("path").data([ series ]), dataJoin.enter().append("path").attr("class", "area"), 
                dataJoin.style("fill", function(s) {
                    return s.striped !== !0 ? s.color : "url(#areaPattern_" + s.index + ")";
                }).style("opacity", function(s) {
                    return s.striped ? "1" : "0.8";
                }).attr("d", function(d) {
                    return drawers[d.axis](d.values);
                });
            }), this;
        },
        createLeftAreaDrawer: function(scales, mode, tension) {
            return d3.svg.area().x(function(d) {
                return scales.xScale(d.x);
            }).y0(function(d) {
                return scales.yScale(d.y0);
            }).y1(function(d) {
                return scales.yScale(d.y0 + d.y);
            }).interpolate(mode).tension(tension);
        },
        createRightAreaDrawer: function(scales, mode, tension) {
            return d3.svg.area().x(function(d) {
                return scales.xScale(d.x);
            }).y0(function(d) {
                return scales.y2Scale(d.y0);
            }).y1(function(d) {
                return scales.y2Scale(d.y0 + d.y);
            }).interpolate(mode).tension(tension);
        },
        getPseudoColumns: function(data, options) {
            var keys, pseudoColumns;
            return data = data.filter(function(s) {
                return "column" === s.type;
            }), pseudoColumns = {}, keys = [], data.forEach(function(series) {
                var i, inAStack, index, visible, _ref;
                return i = options.series.map(function(d) {
                    return d.id;
                }).indexOf(series.id), visible = null != (_ref = options.series) ? _ref[i].visible : void 0, 
                void 0 !== visible && visible !== !0 || (inAStack = !1, options.stacks.forEach(function(stack, index) {
                    var _ref1;
                    return null != series.id && (_ref1 = series.id, __indexOf.call(stack.series, _ref1) >= 0) ? (pseudoColumns[series.id] = index, 
                    __indexOf.call(keys, index) < 0 && keys.push(index), inAStack = !0) : void 0;
                }), inAStack !== !1) ? void 0 : (i = pseudoColumns[series.id] = index = keys.length, 
                keys.push(i));
            }), {
                pseudoColumns: pseudoColumns,
                keys: keys
            };
        },
        getMinDelta: function(seriesData, key, scale, range) {
            return d3.min(seriesData.map(function(series) {
                return series.values.map(function(d) {
                    return scale(d[key]);
                }).filter(function(e) {
                    return range ? e >= range[0] && e <= range[1] : !0;
                }).reduce(function(prev, cur, i, arr) {
                    var diff;
                    return diff = i > 0 ? Math.max(cur - arr[i - 1], 0) : Number.MAX_VALUE, prev > diff ? diff : prev;
                }, Number.MAX_VALUE);
            }));
        },
        getBestColumnWidth: function(axes, dimensions, seriesData, options) {
            var colData, delta, innerWidth, keys, nSeries, pseudoColumns, _ref;
            return seriesData && 0 !== seriesData.length ? 0 === seriesData.filter(function(s) {
                return "column" === s.type;
            }).length ? 10 : (_ref = this.getPseudoColumns(seriesData, options), pseudoColumns = _ref.pseudoColumns, 
            keys = _ref.keys, innerWidth = dimensions.width - dimensions.left - dimensions.right, 
            colData = seriesData.filter(function(d) {
                return pseudoColumns.hasOwnProperty(d.id);
            }), delta = this.getMinDelta(colData, "x", axes.xScale, [ 0, innerWidth ]), delta > innerWidth && (delta = .25 * innerWidth), 
            nSeries = keys.length, options.columnsHGap < delta ? Math.max(1, (delta - options.columnsHGap) / nSeries) : Math.max(1, .8 * delta / nSeries)) : 10;
        },
        getColumnAxis: function(data, columnWidth, options) {
            var keys, pseudoColumns, x1, _ref;
            return _ref = this.getPseudoColumns(data, options), pseudoColumns = _ref.pseudoColumns, 
            keys = _ref.keys, x1 = d3.scale.ordinal().domain(keys).rangeBands([ 0, keys.length * columnWidth ], 0), 
            function(s) {
                var index;
                return null == pseudoColumns[s.id] ? 0 : (index = pseudoColumns[s.id], x1(index) - keys.length * columnWidth / 2);
            };
        },
        drawColumns: function(svg, axes, data, columnWidth, options, handlers, dispatch) {
            var colGroup, colJoin, x1;
            return data = data.filter(function(s) {
                return "column" === s.type;
            }), x1 = this.getColumnAxis(data, columnWidth, options), data.forEach(function(s) {
                return s.xOffset = x1(s) + .5 * columnWidth;
            }), colJoin = svg.select(".content").selectAll(".columnGroup").data(data), colGroup = colJoin.enter().append("g").attr("class", function(s) {
                return "columnGroup series_" + s.index;
            }), colJoin.attr("transform", function(s) {
                return "translate(" + x1(s) + ",0)";
            }), colJoin.each(function(series) {
                var dataJoin, i, visible, _ref;
                return i = options.series.map(function(d) {
                    return d.id;
                }).indexOf(series.id), visible = null != (_ref = options.series) ? _ref[i].visible : void 0, 
                void 0 === visible || visible === !0 ? (dataJoin = d3.select(this).selectAll("rect").data(series.values), 
                dataJoin.enter().append("rect").on({
                    click: function(d, i) {
                        return dispatch.click(d, i, series);
                    }
                }).on("mouseenter", function(d, i) {
                    return dispatch.mouseenter(d, i, series);
                }).on("mouseover", function(d, i) {
                    return "function" == typeof handlers.onMouseOver && handlers.onMouseOver(svg, {
                        series: series,
                        x: axes.xScale(d.x),
                        y: axes[d.axis + "Scale"](d.y0 + d.y),
                        datum: d
                    }, options.axes), dispatch.hover(d, i, series), dispatch.mouseover(d, i, series);
                }).on("mouseout", function(d, i) {
                    return "function" == typeof handlers.onMouseOut && handlers.onMouseOut(svg), dispatch.mouseout(d, i, series);
                }), dataJoin.style({
                    stroke: series.color,
                    fill: series.color,
                    "stroke-opacity": function(d) {
                        return 0 === d.y ? "0" : "1";
                    },
                    "stroke-width": "1px",
                    "fill-opacity": function(d) {
                        return 0 === d.y ? 0 : .7;
                    }
                }).attr({
                    width: columnWidth,
                    x: function(d) {
                        return axes.xScale(d.x);
                    },
                    height: function(d) {
                        return 0 === d.y ? axes[d.axis + "Scale"].range()[0] : Math.abs(axes[d.axis + "Scale"](d.y0 + d.y) - axes[d.axis + "Scale"](d.y0));
                    },
                    y: function(d) {
                        return 0 === d.y ? 0 : axes[d.axis + "Scale"](Math.max(0, d.y0 + d.y));
                    }
                })) : void 0;
            }), this;
        },
        drawDots: function(svg, axes, data, options, handlers, dispatch) {
            var dotGroup, dotJoin;
            return dotJoin = svg.select(".content").selectAll(".dotGroup").data(data.filter(function(s) {
                var _ref;
                return ("line" === (_ref = s.type) || "area" === _ref) && s.drawDots;
            })), dotGroup = dotJoin.enter().append("g").attr("class", function(s) {
                return "dotGroup series_" + s.index;
            }), dotJoin.attr("fill", function(s) {
                return s.color;
            }), dotJoin.each(function(series) {
                var dataJoin;
                return dataJoin = d3.select(this).selectAll(".dot").data(series.values), dataJoin.enter().append("circle").attr("class", "dot").on({
                    click: function(d, i) {
                        return dispatch.click(d, i, series);
                    }
                }).on({
                    mouseenter: function(d, i) {
                        return dispatch.mouseenter(d, i, series);
                    }
                }).on({
                    mouseover: function(d, i) {
                        return dispatch.hover(d, i, series), dispatch.mouseover(d, i, series);
                    }
                }).on({
                    mouseout: function(d, i) {
                        return dispatch.mouseout(d, i, series);
                    }
                }), dataJoin.attr({
                    r: function(d) {
                        return d.dotSize;
                    },
                    cx: function(d) {
                        return axes.xScale(d.x);
                    },
                    cy: function(d) {
                        return axes[d.axis + "Scale"](d.y + d.y0);
                    }
                }).style({
                    stroke: "white",
                    "stroke-width": "2px"
                });
            }), "none" !== options.tooltip.mode && dotGroup.on("mouseover", function(series) {
                var d, target;
                return target = d3.select(d3.event.target), d = target.datum(), target.attr("r", function(s) {
                    return s.dotSize + 2;
                }), "function" == typeof handlers.onMouseOver ? handlers.onMouseOver(svg, {
                    series: series,
                    x: target.attr("cx"),
                    y: target.attr("cy"),
                    datum: d
                }, options.axes) : void 0;
            }).on("mouseout", function(d) {
                return d3.select(d3.event.target).attr("r", function(s) {
                    return s.dotSize;
                }), "function" == typeof handlers.onMouseOut ? handlers.onMouseOut(svg) : void 0;
            }), this;
        },
        getEventDispatcher: function() {
            var events;
            return events = [ "focus", "hover", "mouseenter", "mouseover", "mouseout", "click", "toggle" ], 
            d3.dispatch.apply(this, events);
        },
        resetZoom: function(svg, dimensions, axes, data, columnWidth, options, handlers, dispatch, zoom) {
            return zoom.scale(1), zoom.translate([ 0, 0 ]), this.getZoomHandler(svg, dimensions, axes, data, columnWidth, options, handlers, dispatch, !1)();
        },
        getZoomHandler: function(svg, dimensions, axes, data, columnWidth, options, handlers, dispatch, zoom) {
            var self;
            return self = this, function() {
                var zoomed;
                return zoomed = !1, [ "x", "y", "y2" ].forEach(function(axis) {
                    var _ref;
                    return null != (null != (_ref = options.axes[axis]) ? _ref.zoomable : void 0) ? (svg.selectAll("." + axis + ".axis").call(axes["" + axis + "Axis"]), 
                    zoomed = !0) : void 0;
                }), data.length && (columnWidth = self.getBestColumnWidth(axes, dimensions, data, options), 
                self.drawData(svg, dimensions, axes, data, columnWidth, options, handlers, dispatch)), 
                zoom && zoomed ? self.createZoomResetIcon(svg, dimensions, axes, data, columnWidth, options, handlers, dispatch, zoom) : void 0;
            };
        },
        setZoom: function(svg, dimensions, axes, data, columnWidth, options, handlers, dispatch) {
            var zoom;
            return zoom = this.getZoomListener(axes, options), zoom ? (zoom.on("zoom", this.getZoomHandler(svg, dimensions, axes, data, columnWidth, options, handlers, dispatch, zoom)), 
            svg.call(zoom)) : void 0;
        },
        getZoomListener: function(axes, options) {
            var zoom, zoomable;
            return zoomable = !1, zoom = d3.behavior.zoom(), [ "x", "y", "y2" ].forEach(function(axis) {
                var _ref;
                return (null != (_ref = options.axes[axis]) ? _ref.zoomable : void 0) ? (zoom[axis](axes["" + axis + "Scale"]), 
                zoomable = !0) : void 0;
            }), zoomable ? zoom : !1;
        },
        computeLegendLayout: function(svg, series, dimensions) {
            var cumul, i, j, leftLayout, leftWidths, padding, rightLayout, rightWidths, that, w;
            for (padding = 10, that = this, leftWidths = this.getLegendItemsWidths(svg, "y"), 
            leftLayout = [ 0 ], i = 1; i < leftWidths.length; ) leftLayout.push(leftWidths[i - 1] + leftLayout[i - 1] + padding), 
            i++;
            if (rightWidths = this.getLegendItemsWidths(svg, "y2"), !(rightWidths.length > 0)) return [ leftLayout ];
            for (w = dimensions.width - dimensions.right - dimensions.left, cumul = 0, rightLayout = [], 
            j = rightWidths.length - 1; j >= 0; ) rightLayout.push(w - cumul - rightWidths[j]), 
            cumul += rightWidths[j] + padding, j--;
            return rightLayout.reverse(), [ leftLayout, rightLayout ];
        },
        getLegendItemsWidths: function(svg, axis) {
            var bbox, i, items, that, widths;
            if (that = this, bbox = function(t) {
                return that.getTextBBox(t).width;
            }, items = svg.selectAll(".legendItem." + axis), !(items.length > 0)) return [];
            for (widths = [], i = 0; i < items[0].length; ) widths.push(bbox(items[0][i])), 
            i++;
            return widths;
        },
        drawLegend: function(svg, series, dimensions, handlers, dispatch) {
            var d, groups, legend, that, translateLegends;
            return that = this, legend = svg.append("g").attr("class", "legend"), d = 16, svg.select("defs").append("svg:clipPath").attr("id", "legend-clip").append("circle").attr("r", d / 2), 
            groups = legend.selectAll(".legendItem").data(series), groups.enter().append("g").on("click", function(s, i) {
                var visibility;
                return visibility = !(s.visible !== !1), dispatch.toggle(s, i, visibility), "function" == typeof handlers.onSeriesVisibilityChange ? handlers.onSeriesVisibilityChange({
                    series: s,
                    index: i,
                    newVisibility: visibility
                }) : void 0;
            }), groups.attr({
                "class": function(s, i) {
                    return "legendItem series_" + i + " " + s.axis;
                },
                opacity: function(s, i) {
                    return s.visible === !1 ? (that.toggleSeries(svg, i), "0.2") : "1";
                }
            }).each(function(s) {
                var item, _ref;
                return item = d3.select(this), item.append("circle").attr({
                    fill: s.color,
                    stroke: s.color,
                    "stroke-width": "2px",
                    r: d / 2
                }), item.append("path").attr({
                    "clip-path": "url(#legend-clip)",
                    "fill-opacity": "area" === (_ref = s.type) || "column" === _ref ? "1" : "0",
                    fill: "white",
                    stroke: "white",
                    "stroke-width": "2px",
                    d: that.getLegendItemPath(s, d, d)
                }), item.append("circle").attr({
                    "fill-opacity": 0,
                    stroke: s.color,
                    "stroke-width": "2px",
                    r: d / 2
                }), item.append("text").attr({
                    "class": function(d, i) {
                        return "legendText series_" + i;
                    },
                    "font-family": "Courier",
                    "font-size": 10,
                    transform: "translate(13, 4)",
                    "text-rendering": "geometric-precision"
                }).text(s.label || s.y);
            }), translateLegends = function() {
                var left, right, _ref;
                return _ref = that.computeLegendLayout(svg, series, dimensions), left = _ref[0], 
                right = _ref[1], groups.attr({
                    transform: function(s, i) {
                        return "y" === s.axis ? "translate(" + left.shift() + "," + (dimensions.height - 40) + ")" : "translate(" + right.shift() + "," + (dimensions.height - 40) + ")";
                    }
                });
            }, translateLegends(), setTimeout(translateLegends, 0), this;
        },
        getLegendItemPath: function(series, w, h) {
            var base_path, path;
            return "column" === series.type ? (path = "M" + -w / 3 + " " + -h / 8 + " l0 " + h + " ", 
            path += "M0 " + -h / 3 + " l0 " + h + " ", path += "M" + w / 3 + " " + -h / 10 + " l0 " + h + " ") : (base_path = "M-" + w / 2 + " 0" + h / 3 + " l" + w / 3 + " -" + h / 3 + " l" + w / 3 + " " + h / 3 + " l" + w / 3 + " -" + 2 * h / 3, 
            "area" === series.type, base_path);
        },
        toggleSeries: function(svg, index) {
            var isVisible;
            return isVisible = !1, svg.select(".content").selectAll(".series_" + index).style("display", function(s) {
                return "none" === d3.select(this).style("display") ? (isVisible = !0, "initial") : (isVisible = !1, 
                "none");
            }), isVisible;
        },
        drawLines: function(svg, scales, data, options, handlers) {
            var drawers, interpolateData, lineGroup, lineJoin;
            return drawers = {
                y: this.createLeftLineDrawer(scales, options.lineMode, options.tension),
                y2: this.createRightLineDrawer(scales, options.lineMode, options.tension)
            }, lineJoin = svg.select(".content").selectAll(".lineGroup").data(data.filter(function(s) {
                var _ref;
                return "line" === (_ref = s.type) || "area" === _ref;
            })), lineGroup = lineJoin.enter().append("g").attr("class", function(s) {
                return "lineGroup series_" + s.index;
            }), lineJoin.style("stroke", function(s) {
                return s.color;
            }), lineJoin.each(function(series) {
                var dataJoin;
                return dataJoin = d3.select(this).selectAll("path").data([ series ]), dataJoin.enter().append("path").attr("class", "line"), 
                dataJoin.attr("d", function(d) {
                    return drawers[d.axis](d.values);
                }).style({
                    fill: "none",
                    "stroke-width": function(s) {
                        return s.thickness;
                    },
                    "stroke-dasharray": function(s) {
                        return "dashed" === s.lineMode ? "10,3" : void 0;
                    }
                });
            }), options.tooltip.interpolate && (interpolateData = function(series) {
                var datum, error, i, interpDatum, maxXPos, maxXValue, maxYPos, maxYValue, minXPos, minXValue, minYPos, minYValue, mousePos, target, valuesData, x, xPercentage, xVal, y, yPercentage, yVal, _i, _len;
                target = d3.select(d3.event.target);
                try {
                    mousePos = d3.mouse(this);
                } catch (_error) {
                    error = _error, mousePos = [ 0, 0 ];
                }
                for (valuesData = target.datum().values, i = _i = 0, _len = valuesData.length; _len > _i; i = ++_i) datum = valuesData[i], 
                x = scales.xScale(datum.x), y = scales.yScale(datum.y), ("undefined" == typeof minXPos || null === minXPos || minXPos > x) && (minXPos = x, 
                minXValue = datum.x), ("undefined" == typeof maxXPos || null === maxXPos || x > maxXPos) && (maxXPos = x, 
                maxXValue = datum.x), ("undefined" == typeof minYPos || null === minYPos || minYPos > y) && (minYPos = y), 
                ("undefined" == typeof maxYPos || null === maxYPos || y > maxYPos) && (maxYPos = y), 
                ("undefined" == typeof minYValue || null === minYValue || datum.y < minYValue) && (minYValue = datum.y), 
                ("undefined" == typeof maxYValue || null === maxYValue || datum.y > maxYValue) && (maxYValue = datum.y);
                return xPercentage = (mousePos[0] - minXPos) / (maxXPos - minXPos), yPercentage = (mousePos[1] - minYPos) / (maxYPos - minYPos), 
                xVal = Math.round(xPercentage * (maxXValue - minXValue) + minXValue), yVal = Math.round((1 - yPercentage) * (maxYValue - minYValue) + minYValue), 
                interpDatum = {
                    x: xVal,
                    y: yVal
                }, "function" == typeof handlers.onMouseOver ? handlers.onMouseOver(svg, {
                    series: series,
                    x: mousePos[0],
                    y: mousePos[1],
                    datum: interpDatum
                }, options.axes) : void 0;
            }, lineGroup.on("mousemove", interpolateData).on("mouseout", function(d) {
                return "function" == typeof handlers.onMouseOut ? handlers.onMouseOut(svg) : void 0;
            })), this;
        },
        createLeftLineDrawer: function(scales, mode, tension) {
            return d3.svg.line().x(function(d) {
                return scales.xScale(d.x);
            }).y(function(d) {
                return scales.yScale(d.y + d.y0);
            }).interpolate(mode).tension(tension);
        },
        createRightLineDrawer: function(scales, mode, tension) {
            return d3.svg.line().x(function(d) {
                return scales.xScale(d.x);
            }).y(function(d) {
                return scales.y2Scale(d.y + d.y0);
            }).interpolate(mode).tension(tension);
        },
        getPixelCssProp: function(element, propertyName) {
            var string;
            return string = $window.getComputedStyle(element, null).getPropertyValue(propertyName), 
            +string.replace(/px$/, "");
        },
        getDefaultMargins: function() {
            return {
                top: 20,
                right: 50,
                bottom: 60,
                left: 50
            };
        },
        getDefaultThumbnailMargins: function() {
            return {
                top: 1,
                right: 1,
                bottom: 2,
                left: 0
            };
        },
        getElementDimensions: function(element, width, height) {
            var bottom, dim, left, parent, right, top;
            return dim = {}, parent = element, top = this.getPixelCssProp(parent, "padding-top"), 
            bottom = this.getPixelCssProp(parent, "padding-bottom"), left = this.getPixelCssProp(parent, "padding-left"), 
            right = this.getPixelCssProp(parent, "padding-right"), dim.width = +(width || parent.offsetWidth || 900) - left - right, 
            dim.height = +(height || parent.offsetHeight || 500) - top - bottom, dim;
        },
        getDimensions: function(options, element, attrs) {
            var dim;
            return dim = this.getElementDimensions(element[0].parentElement, attrs.width, attrs.height), 
            dim = angular.extend(options.margin, dim);
        },
        clean: function(element) {
            return d3.select(element).on("keydown", null).on("keyup", null).select("svg").remove();
        },
        uuid: function() {
            return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
                var r, v;
                return r = 16 * Math.random() | 0, v = "x" === c ? r : 3 & r | 8, v.toString(16);
            });
        },
        bootstrap: function(element, id, dimensions) {
            var defs, height, svg, width;
            return d3.select(element).classed("chart", !0), width = dimensions.width, height = dimensions.height, 
            svg = d3.select(element).append("svg").attr({
                width: width,
                height: height
            }).append("g").attr("transform", "translate(" + dimensions.left + "," + dimensions.top + ")"), 
            defs = svg.append("defs").attr("class", "patterns"), defs.append("clipPath").attr("class", "content-clip").attr("id", "content-clip-" + id).append("rect").attr({
                x: 0,
                y: 0,
                width: width - dimensions.left - dimensions.right,
                height: height - dimensions.top - dimensions.bottom
            }), svg;
        },
        createContent: function(svg, id, options) {
            var content;
            return content = svg.append("g").attr("class", "content"), options.hideOverflow ? content.attr("clip-path", "url(#content-clip-" + id + ")") : void 0;
        },
        createZoomResetIcon: function(svg, dimensions, axes, data, columnWidth, options, handlers, dispatch, zoom) {
            var icon, iconJoin, left, path, scale, self, top;
            return self = this, path = "M22.646,19.307c0.96-1.583,1.523-3.435,1.524-5.421C24.169,8.093,19.478,3.401,13.688,3.399C7.897,3.401,3.204,8.093,3.204,13.885c0,5.789,4.693,10.481,10.484,10.481c1.987,0,3.839-0.563,5.422-1.523l7.128,7.127l3.535-3.537L22.646,19.307zM13.688,20.369c-3.582-0.008-6.478-2.904-6.484-6.484c0.006-3.582,2.903-6.478,6.484-6.486c3.579,0.008,6.478,2.904,6.484,6.486C20.165,17.465,17.267,20.361,13.688,20.369zM8.854,11.884v4.001l9.665-0.001v-3.999L8.854,11.884z", 
            iconJoin = svg.select(".focus-container").selectAll(".icon.zoom-reset").data([ 1 ]), 
            icon = iconJoin.enter().append("g").attr("class", "icon zoom-reset").on("click", function() {
                return self.resetZoom(svg, dimensions, axes, data, columnWidth, options, handlers, dispatch, zoom), 
                d3.select(this).remove();
            }).on("mouseenter", function() {
                return d3.select(this).style("fill", "steelblue");
            }).on("mouseout", function() {
                return d3.select(this).style("fill", "black");
            }), icon.append("path").attr("d", path), left = dimensions.width - dimensions.left - dimensions.right - 24, 
            top = 2, scale = .7, iconJoin.style({
                fill: "black",
                stroke: "white",
                "stroke-width": 1.5
            }).attr({
                opacity: 1,
                transform: "translate(" + left + ", " + top + ") scale(" + scale + ")"
            });
        },
        createFocus: function(svg, dimensions, options) {
            var glass;
            return glass = svg.append("g").attr({
                "class": "focus-container"
            });
        },
        createGlass: function(svg, dimensions, handlers, axes, data, options, dispatch, columnWidth) {
            var glass, scrubberGroup, that;
            return that = this, glass = svg.append("g").attr({
                "class": "glass-container",
                opacity: 0
            }), scrubberGroup = glass.selectAll(".scrubberItem").data(data).enter().append("g").attr("class", function(s, i) {
                return "scrubberItem series_" + i;
            }), scrubberGroup.each(function(s, i) {
                var g, g2, item;
                return item = d3.select(this), g = item.append("g").attr({
                    "class": "rightTT"
                }), g.append("path").attr({
                    "class": "scrubberPath series_" + i,
                    y: "-7px",
                    fill: s.color
                }), that.styleTooltip(g.append("text").style("text-anchor", "start").attr({
                    "class": function(d, i) {
                        return "scrubberText series_" + i;
                    },
                    height: "14px",
                    transform: "translate(7, 3)",
                    "text-rendering": "geometric-precision"
                })).text(s.label || s.y), g2 = item.append("g").attr({
                    "class": "leftTT"
                }), g2.append("path").attr({
                    "class": "scrubberPath series_" + i,
                    y: "-7px",
                    fill: s.color
                }), that.styleTooltip(g2.append("text").style("text-anchor", "end").attr({
                    "class": "scrubberText series_" + i,
                    height: "14px",
                    transform: "translate(-13, 3)",
                    "text-rendering": "geometric-precision"
                })).text(s.label || s.y), item.append("circle").attr({
                    "class": "scrubberDot series_" + i,
                    fill: "white",
                    stroke: s.color,
                    "stroke-width": "2px",
                    r: 4
                });
            }), glass.append("rect").attr({
                "class": "glass",
                width: dimensions.width - dimensions.left - dimensions.right,
                height: dimensions.height - dimensions.top - dimensions.bottom
            }).style("fill", "white").style("fill-opacity", 1e-6).on("mouseover", function() {
                return handlers.onChartHover(svg, d3.select(this), axes, data, options, dispatch, columnWidth);
            });
        },
        drawData: function(svg, dimensions, axes, data, columnWidth, options, handlers, dispatch) {
            return this.drawArea(svg, axes, data, options, handlers).drawColumns(svg, axes, data, columnWidth, options, handlers, dispatch).drawLines(svg, axes, data, options, handlers), 
            options.drawDots ? this.drawDots(svg, axes, data, options, handlers, dispatch) : void 0;
        },
        getDataPerSeries: function(data, options) {
            var axes, layout, series, straightened;
            return series = options.series, axes = options.axes, series && series.length && data && data.length ? (straightened = series.map(function(s, i) {
                var seriesData;
                return seriesData = {
                    index: i,
                    name: s.y,
                    values: [],
                    color: s.color,
                    axis: s.axis || "y",
                    xOffset: 0,
                    type: s.type,
                    thickness: s.thickness,
                    drawDots: s.drawDots !== !1
                }, null != s.dotSize && (seriesData.dotSize = s.dotSize), s.striped === !0 && (seriesData.striped = !0), 
                null != s.lineMode && (seriesData.lineMode = s.lineMode), s.id && (seriesData.id = s.id), 
                data.filter(function(row) {
                    return null != row[s.y];
                }).forEach(function(row) {
                    var d;
                    return d = {
                        x: row[options.axes.x.key],
                        y: row[s.y],
                        y0: 0,
                        axis: s.axis || "y"
                    }, null != s.dotSize && (d.dotSize = s.dotSize), seriesData.values.push(d);
                }), seriesData;
            }), null == options.stacks || 0 === options.stacks.length ? straightened : (layout = d3.layout.stack().values(function(s) {
                return s.values;
            }), options.stacks.forEach(function(stack) {
                var layers;
                if (stack.series.length > 0) return layers = straightened.filter(function(s, i) {
                    return void 0 === series[i].visible || series[i].visible;
                }).filter(function(s, i) {
                    var _ref;
                    return null != s.id && (_ref = s.id, __indexOf.call(stack.series, _ref) >= 0);
                }), layout(layers);
            }), straightened)) : [];
        },
        estimateSideTooltipWidth: function(svg, text) {
            var bbox, t;
            return t = svg.append("text"), t.text("" + text), this.styleTooltip(t), bbox = this.getTextBBox(t[0][0]), 
            t.remove(), bbox;
        },
        getTextBBox: function(svgTextElement) {
            var error;
            if (null !== svgTextElement) try {
                return svgTextElement.getBBox();
            } catch (_error) {
                return error = _error, {
                    height: 0,
                    width: 0,
                    y: 0,
                    x: 0
                };
            }
            return {};
        },
        getWidestTickWidth: function(svg, axisKey) {
            var bbox, max, ticks, _ref;
            return max = 0, bbox = this.getTextBBox, ticks = svg.select("." + axisKey + ".axis").selectAll(".tick"), 
            null != (_ref = ticks[0]) && _ref.forEach(function(t) {
                return max = Math.max(max, bbox(t).width);
            }), max;
        },
        getWidestOrdinate: function(data, series, options) {
            var widest;
            return widest = "", data.forEach(function(row) {
                return series.forEach(function(series) {
                    var v, _ref;
                    return v = row[series.y], null != series.axis && (null != (_ref = options.axes[series.axis]) ? _ref.ticksFormatter : void 0) && (v = options.axes[series.axis].ticksFormatter(v)), 
                    null != v && ("" + v).length > ("" + widest).length ? widest = v : void 0;
                });
            }), widest;
        },
        getDefaultOptions: function() {
            return {
                tooltip: {
                    mode: "scrubber"
                },
                lineMode: "linear",
                tension: .7,
                margin: this.getDefaultMargins(),
                axes: {
                    x: {
                        type: "linear",
                        key: "x"
                    },
                    y: {
                        type: "linear"
                    }
                },
                series: [],
                drawLegend: !0,
                drawDots: !0,
                stacks: [],
                columnsHGap: 5,
                hideOverflow: !1
            };
        },
        sanitizeOptions: function(options, mode) {
            var defaultMargin;
            return null == options && (options = {}), "thumbnail" === mode && (options.drawLegend = !1, 
            options.drawDots = !1, options.tooltip = {
                mode: "none",
                interpolate: !1
            }), options.series = this.sanitizeSeriesOptions(options.series), options.stacks = this.sanitizeSeriesStacks(options.stacks, options.series), 
            options.axes = this.sanitizeAxes(options.axes, this.haveSecondYAxis(options.series)), 
            options.tooltip = this.sanitizeTooltip(options.tooltip), options.margin = this.sanitizeMargins(options.margin), 
            options.lineMode || (options.lineMode = this.getDefaultOptions().lineMode), options.tension = /^\d+(\.\d+)?$/.test(options.tension) ? options.tension : this.getDefaultOptions().tension, 
            options.drawLegend = options.drawLegend !== !1, options.drawDots = options.drawDots !== !1, 
            angular.isNumber(options.columnsHGap) || (options.columnsHGap = 5), options.hideOverflow = options.hideOverflow || !1, 
            defaultMargin = "thumbnail" === mode ? this.getDefaultThumbnailMargins() : this.getDefaultMargins(), 
            options.series = angular.extend(this.getDefaultOptions().series, options.series), 
            options.axes = angular.extend(this.getDefaultOptions().axes, options.axes), options.tooltip = angular.extend(this.getDefaultOptions().tooltip, options.tooltip), 
            options.margin = angular.extend(defaultMargin, options.margin), options;
        },
        sanitizeMargins: function(options) {
            var attrs, margin, opt, value;
            attrs = [ "top", "right", "bottom", "left" ], margin = {};
            for (opt in options) value = options[opt], __indexOf.call(attrs, opt) >= 0 && (margin[opt] = parseFloat(value));
            return margin;
        },
        sanitizeSeriesStacks: function(stacks, series) {
            var seriesKeys;
            return null == stacks ? [] : (seriesKeys = {}, series.forEach(function(s) {
                return seriesKeys[s.id] = s;
            }), stacks.forEach(function(stack) {
                return stack.series.forEach(function(id) {
                    var s;
                    if (s = seriesKeys[id], null != s) {
                        if (s.axis !== stack.axis) return $log.warn("Series " + id + " is not on the same axis as its stack");
                    } else if (!s) return $log.warn("Unknown series found in stack : " + id);
                });
            }), stacks);
        },
        sanitizeTooltip: function(options) {
            var _ref;
            if (!options) return {
                mode: "scrubber"
            };
            if ("none" !== (_ref = options.mode) && "axes" !== _ref && "scrubber" !== _ref && (options.mode = "scrubber"), 
            "scrubber" === options.mode ? delete options.interpolate : options.interpolate = !!options.interpolate, 
            "scrubber" === options.mode && options.interpolate) throw new Error("Interpolation is not supported for scrubber tooltip mode.");
            return options;
        },
        sanitizeSeriesOptions: function(options) {
            var colors, knownIds;
            return null == options ? [] : (colors = d3.scale.category10(), knownIds = {}, options.forEach(function(s, i) {
                if (null != knownIds[s.id]) throw new Error("Twice the same ID (" + s.id + ") ? Really ?");
                return null != s.id ? knownIds[s.id] = s : void 0;
            }), options.forEach(function(s, i) {
                var cnt, _ref, _ref1, _ref2, _ref3;
                if (s.axis = "y2" !== (null != (_ref = s.axis) ? _ref.toLowerCase() : void 0) ? "y" : "y2", 
                s.color || (s.color = colors(i)), s.type = "line" === (_ref1 = s.type) || "area" === _ref1 || "column" === _ref1 ? s.type : "line", 
                "column" === s.type ? (delete s.thickness, delete s.lineMode, delete s.drawDots, 
                delete s.dotSize) : /^\d+px$/.test(s.thickness) || (s.thickness = "1px"), "line" !== (_ref2 = s.type) && "area" !== _ref2 || ("dashed" !== (_ref3 = s.lineMode) && delete s.lineMode, 
                s.drawDots !== !1 && null == s.dotSize && (s.dotSize = 2)), null == s.id) {
                    for (cnt = 0; null != knownIds["series_" + cnt]; ) cnt++;
                    s.id = "series_" + cnt, knownIds[s.id] = s;
                }
                return s.drawDots === !1 ? delete s.dotSize : void 0;
            }), options);
        },
        sanitizeAxes: function(axesOptions, secondAxis) {
            var _base;
            return null == axesOptions && (axesOptions = {}), axesOptions.x = this.sanitizeAxisOptions(axesOptions.x), 
            (_base = axesOptions.x).key || (_base.key = "x"), axesOptions.y = this.sanitizeAxisOptions(axesOptions.y), 
            secondAxis && (axesOptions.y2 = this.sanitizeAxisOptions(axesOptions.y2)), axesOptions;
        },
        sanitizeExtrema: function(axisOptions) {
            var extremum, originalValue, _i, _len, _ref, _results;
            for (_ref = [ "min", "max" ], _results = [], _i = 0, _len = _ref.length; _len > _i; _i++) extremum = _ref[_i], 
            originalValue = axisOptions[extremum], null != originalValue ? (axisOptions[extremum] = this.sanitizeExtremum(extremum, axisOptions), 
            null == axisOptions[extremum] ? _results.push($log.warn("Invalid " + extremum + " value '" + originalValue + "' (parsed as " + axisOptions[extremum] + "), ignoring it.")) : _results.push(void 0)) : _results.push(void 0);
            return _results;
        },
        sanitizeExtremum: function(name, axisOptions) {
            var sanitizer;
            return sanitizer = this.sanitizeNumber, "date" === axisOptions.type && (sanitizer = this.sanitizeDate), 
            sanitizer(axisOptions[name]);
        },
        sanitizeDate: function(value) {
            return null != value && value instanceof Date && !isNaN(value.valueOf()) ? value : void 0;
        },
        sanitizeNumber: function(value) {
            var number;
            if (null != value && (number = parseFloat(value), !isNaN(number))) return number;
        },
        sanitizeAxisOptions: function(options) {
            return null == options ? {
                type: "linear"
            } : (options.type || (options.type = "linear"), null != options.ticksRotate && (options.ticksRotate = this.sanitizeNumber(options.ticksRotate)), 
            null != options.zoomable && (options.zoomable = options.zoomable || !1), null != options.innerTicks && (options.innerTicks = options.innerTicks || !1), 
            null != options.labelFunction && (options.ticksFormatter = options.labelFunction), 
            null != options.ticksFormat && ("date" === options.type ? options.ticksFormatter = d3.time.format(options.ticksFormat) : options.ticksFormatter = d3.format(options.ticksFormat), 
            null == options.tooltipFormatter && (options.tooltipFormatter = options.ticksFormatter)), 
            null != options.tooltipFormat && ("date" === options.type ? options.tooltipFormatter = d3.time.format(options.tooltipFormat) : options.tooltipFormatter = d3.format(options.tooltipFormat)), 
            null != options.ticksInterval && (options.ticksInterval = this.sanitizeNumber(options.ticksInterval)), 
            this.sanitizeExtrema(options), options);
        },
        createAxes: function(svg, dimensions, axesOptions) {
            var createY2Axis, height, style, width, x, xAxis, y, y2, y2Axis, yAxis;
            return createY2Axis = null != axesOptions.y2, width = dimensions.width, height = dimensions.height, 
            width = width - dimensions.left - dimensions.right, height = height - dimensions.top - dimensions.bottom, 
            x = void 0, x = "date" === axesOptions.x.type ? d3.time.scale().rangeRound([ 0, width ]) : d3.scale.linear().rangeRound([ 0, width ]), 
            xAxis = this.createAxis(x, "x", axesOptions), y = void 0, y = "log" === axesOptions.y.type ? d3.scale.log().clamp(!0).rangeRound([ height, 0 ]) : d3.scale.linear().rangeRound([ height, 0 ]), 
            y.clamp(!0), yAxis = this.createAxis(y, "y", axesOptions), y2 = void 0, y2 = createY2Axis && "log" === axesOptions.y2.type ? d3.scale.log().clamp(!0).rangeRound([ height, 0 ]) : d3.scale.linear().rangeRound([ height, 0 ]), 
            y2.clamp(!0), y2Axis = this.createAxis(y2, "y2", axesOptions), style = function(group) {
                return group.style({
                    font: "10px Courier",
                    "shape-rendering": "crispEdges"
                }), group.selectAll("path").style({
                    fill: "none",
                    stroke: "#000"
                });
            }, {
                xScale: x,
                yScale: y,
                y2Scale: y2,
                xAxis: xAxis,
                yAxis: yAxis,
                y2Axis: y2Axis,
                andAddThemIf: function(conditions) {
                    return conditions.all && (conditions.y && (svg.append("g").attr("class", "y grid"), 
                    svg.append("g").attr("class", "y axis").call(yAxis).call(style)), createY2Axis && conditions.y2 && (svg.append("g").attr("class", "y2 grid").attr("transform", "translate(" + width + ", 0)"), 
                    svg.append("g").attr("class", "y2 axis").attr("transform", "translate(" + width + ", 0)").call(y2Axis).call(style)), 
                    conditions.x && (svg.append("g").attr("class", "x grid").attr("transform", "translate(0," + height + ")"), 
                    svg.append("g").attr("class", "x axis").attr("transform", "translate(0," + height + ")").call(xAxis).call(style))), 
                    {
                        xScale: x,
                        yScale: y,
                        y2Scale: y2,
                        xAxis: xAxis,
                        yAxis: yAxis,
                        y2Axis: y2Axis
                    };
                }
            };
        },
        createAxis: function(scale, key, options) {
            var axis, o, sides;
            return sides = {
                x: "bottom",
                y: "left",
                y2: "right"
            }, o = options[key], axis = d3.svg.axis().scale(scale).orient(sides[key]).innerTickSize(4).tickFormat(null != o ? o.ticksFormatter : void 0), 
            null == o ? axis : (angular.isArray(o.ticks) ? axis.tickValues(o.ticks) : angular.isNumber(o.ticks) ? axis.ticks(o.ticks) : angular.isFunction(o.ticks) && axis.ticks(o.ticks, o.ticksInterval), 
            axis);
        },
        setDefaultStroke: function(selection) {
            return selection.attr("stroke", "#000").attr("stroke-width", 1).style("shape-rendering", "crispEdges");
        },
        setDefaultGrid: function(selection) {
            return selection.attr("stroke", "#eee").attr("stroke-width", 1).style("shape-rendering", "crispEdges");
        },
        setScalesDomain: function(scales, data, series, svg, options) {
            var axis, grid, height, width, xGrid, y2Domain, y2Grid, yDomain, yGrid;
            return this.setXScale(scales.xScale, data, series, options.axes), axis = svg.selectAll(".x.axis").call(scales.xAxis), 
            null != options.axes.x.innerTicks && axis.selectAll(".tick>line").call(this.setDefaultStroke), 
            null != options.axes.x.grid && (height = options.margin.height - options.margin.top - options.margin.bottom, 
            xGrid = scales.xAxis.tickSize(-height, 0, 0), grid = svg.selectAll(".x.grid").call(xGrid), 
            grid.selectAll(".tick>line").call(this.setDefaultGrid)), null != options.axes.x.ticksRotate && axis.selectAll(".tick>text").attr("dy", null).attr("transform", "translate(0,5) rotate(" + options.axes.x.ticksRotate + " 0,6)").style("text-anchor", options.axes.x.ticksRotate >= 0 ? "start" : "end"), 
            series.filter(function(s) {
                return "y" === s.axis && s.visible !== !1;
            }).length > 0 && (yDomain = this.getVerticalDomain(options, data, series, "y"), 
            scales.yScale.domain(yDomain).nice(), axis = svg.selectAll(".y.axis").call(scales.yAxis), 
            null != options.axes.y.innerTicks && axis.selectAll(".tick>line").call(this.setDefaultStroke), 
            null != options.axes.y.ticksRotate && axis.selectAll(".tick>text").attr("transform", "rotate(" + options.axes.y.ticksRotate + " -6,0)").style("text-anchor", "end"), 
            null != options.axes.y.grid && (width = options.margin.width - options.margin.left - options.margin.right, 
            yGrid = scales.yAxis.tickSize(-width, 0, 0), grid = svg.selectAll(".y.grid").call(yGrid), 
            grid.selectAll(".tick>line").call(this.setDefaultGrid))), series.filter(function(s) {
                return "y2" === s.axis && s.visible !== !1;
            }).length > 0 && (y2Domain = this.getVerticalDomain(options, data, series, "y2"), 
            scales.y2Scale.domain(y2Domain).nice(), axis = svg.selectAll(".y2.axis").call(scales.y2Axis), 
            null != options.axes.y2.innerTicks && axis.selectAll(".tick>line").call(this.setDefaultStroke), 
            null != options.axes.y2.ticksRotate && axis.selectAll(".tick>text").attr("transform", "rotate(" + options.axes.y2.ticksRotate + " 6,0)").style("text-anchor", "start"), 
            null != options.axes.y2.grid) ? (width = options.margin.width - options.margin.left - options.margin.right, 
            y2Grid = scales.y2Axis.tickSize(-width, 0, 0), grid = svg.selectAll(".y2.grid").call(y2Grid), 
            grid.selectAll(".tick>line").call(this.setDefaultGrid)) : void 0;
        },
        getVerticalDomain: function(options, data, series, key) {
            var domain, mySeries, o;
            return (o = options.axes[key]) ? null != o.ticks && angular.isArray(o.ticks) ? [ o.ticks[0], o.ticks[o.ticks.length - 1] ] : (mySeries = series.filter(function(s) {
                return s.axis === key && s.visible !== !1;
            }), domain = this.yExtent(series.filter(function(s) {
                return s.axis === key && s.visible !== !1;
            }), data, options.stacks.filter(function(stack) {
                return stack.axis === key;
            })), "log" === o.type && (domain[0] = 0 === domain[0] ? .001 : domain[0]), null != o.min && (domain[0] = o.min), 
            null != o.max && (domain[1] = o.max), domain) : [];
        },
        yExtent: function(series, data, stacks) {
            var groups, maxY, minY;
            return minY = Number.POSITIVE_INFINITY, maxY = Number.NEGATIVE_INFINITY, groups = [], 
            stacks.forEach(function(stack) {
                return groups.push(stack.series.map(function(id) {
                    return series.filter(function(s) {
                        return s.id === id;
                    })[0];
                }));
            }), series.forEach(function(series, i) {
                var isInStack;
                return isInStack = !1, stacks.forEach(function(stack) {
                    var _ref;
                    return _ref = series.id, __indexOf.call(stack.series, _ref) >= 0 ? isInStack = !0 : void 0;
                }), isInStack ? void 0 : groups.push([ series ]);
            }), groups.forEach(function(group) {
                return group = group.filter(Boolean), minY = Math.min(minY, d3.min(data, function(d) {
                    return group.reduce(function(a, s) {
                        return Math.min(a, d[s.y]);
                    }, Number.POSITIVE_INFINITY);
                })), maxY = Math.max(maxY, d3.max(data, function(d) {
                    return group.reduce(function(a, s) {
                        return a + d[s.y];
                    }, 0);
                }));
            }), minY === maxY ? minY > 0 ? [ 0, 2 * minY ] : [ 2 * minY, 0 ] : [ minY, maxY ];
        },
        setXScale: function(xScale, data, series, axesOptions) {
            var domain, o;
            return domain = this.xExtent(data, axesOptions.x.key, axesOptions.x.type), series.filter(function(s) {
                return "column" === s.type;
            }).length && this.adjustXDomainForColumns(domain, data, axesOptions.x.key), o = axesOptions.x, 
            null != o.min && (domain[0] = o.min), null != o.max && (domain[1] = o.max), xScale.domain(domain);
        },
        xExtent: function(data, key, type) {
            var delta, from, to, _ref;
            return _ref = d3.extent(data, function(d) {
                return d[key];
            }), from = _ref[0], to = _ref[1], from === to ? "date" === type ? (delta = 864e5, 
            [ new Date(+from - delta), new Date(+to + delta) ]) : from > 0 ? [ 0, 2 * from ] : [ 2 * from, 0 ] : [ from, to ];
        },
        adjustXDomainForColumns: function(domain, data, field) {
            var step;
            return step = this.getAverageStep(data, field), angular.isDate(domain[0]) ? (domain[0] = new Date(+domain[0] - step), 
            domain[1] = new Date(+domain[1] + step)) : (domain[0] = domain[0] - step, domain[1] = domain[1] + step);
        },
        getAverageStep: function(data, field) {
            var i, n, sum;
            if (!(data.length > 1)) return 0;
            for (sum = 0, n = data.length - 1, i = 0; n > i; ) sum += data[i + 1][field] - data[i][field], 
            i++;
            return sum / n;
        },
        haveSecondYAxis: function(series) {
            return !series.every(function(s) {
                return "y2" !== s.axis;
            });
        },
        showScrubber: function(svg, glass, axes, data, options, dispatch, columnWidth) {
            var that;
            return that = this, glass.on("mousemove", function() {
                return svg.selectAll(".glass-container").attr("opacity", 1), that.updateScrubber(svg, d3.mouse(this), axes, data, options, dispatch, columnWidth);
            }), glass.on("mouseout", function() {
                return glass.on("mousemove", null), svg.selectAll(".glass-container").attr("opacity", 0);
            });
        },
        getClosestPoint: function(values, xValue) {
            var d, d0, d1, i, xBisector;
            return xBisector = d3.bisector(function(d) {
                return d.x;
            }).left, i = xBisector(values, xValue), 0 === i ? values[0] : i > values.length - 1 ? values[values.length - 1] : (d0 = values[i - 1], 
            d1 = values[i], d = xValue - d0.x > d1.x - xValue ? d1 : d0);
        },
        updateScrubber: function(svg, _arg, axes, data, options, dispatch, columnWidth) {
            var ease, positions, that, tickLength, x, y;
            return x = _arg[0], y = _arg[1], ease = function(element) {
                return element.transition().duration(50);
            }, that = this, positions = [], data.forEach(function(series, index) {
                var color, item, lText, left, rText, right, side, sizes, text, v, xInvert, xPos, yInvert;
                return item = svg.select(".scrubberItem.series_" + index), options.series[index].visible === !1 ? void item.attr("opacity", 0) : (item.attr("opacity", 1), 
                xInvert = axes.xScale.invert(x), yInvert = axes.yScale.invert(y), v = that.getClosestPoint(series.values, xInvert), 
                dispatch.focus(v, series.values.indexOf(v), [ xInvert, yInvert ]), text = v.x + " : " + v.y, 
                options.tooltip.formatter && (text = options.tooltip.formatter(v.x, v.y, options.series[index])), 
                right = item.select(".rightTT"), rText = right.select("text"), rText.text(text), 
                left = item.select(".leftTT"), lText = left.select("text"), lText.text(text), sizes = {
                    right: that.getTextBBox(rText[0][0]).width + 5,
                    left: that.getTextBBox(lText[0][0]).width + 5
                }, side = "y2" === series.axis ? "right" : "left", xPos = axes.xScale(v.x), "left" === side ? xPos + that.getTextBBox(lText[0][0]).x - 10 < 0 && (side = "right") : "right" === side && xPos + sizes.right > that.getTextBBox(svg.select(".glass")[0][0]).width && (side = "left"), 
                "left" === side ? (ease(right).attr("opacity", 0), ease(left).attr("opacity", 1)) : (ease(right).attr("opacity", 1), 
                ease(left).attr("opacity", 0)), positions[index] = {
                    index: index,
                    x: xPos,
                    y: axes[v.axis + "Scale"](v.y + v.y0),
                    side: side,
                    sizes: sizes
                }, color = angular.isFunction(series.color) ? series.color(v, series.values.indexOf(v)) : series.color, 
                item.selectAll("circle").attr("stroke", color), item.selectAll("path").attr("fill", color));
            }), positions = this.preventOverlapping(positions), tickLength = Math.max(15, 100 / columnWidth), 
            data.forEach(function(series, index) {
                var item, p, tt, xOffset;
                if (options.series[index].visible !== !1) return p = positions[index], item = svg.select(".scrubberItem.series_" + index), 
                tt = item.select("." + p.side + "TT"), xOffset = "left" === p.side ? series.xOffset : -series.xOffset, 
                tt.select("text").attr("transform", function() {
                    return "left" === p.side ? "translate(" + (-3 - tickLength - xOffset) + ", " + (p.labelOffset + 3) + ")" : "translate(" + (4 + tickLength + xOffset) + ", " + (p.labelOffset + 3) + ")";
                }), tt.select("path").attr("d", that.getScrubberPath(p.sizes[p.side] + 1, p.labelOffset, p.side, tickLength + xOffset)), 
                ease(item).attr({
                    transform: "translate(" + (positions[index].x + series.xOffset) + ", " + positions[index].y + ")"
                });
            });
        },
        getScrubberPath: function(w, yOffset, side, padding) {
            var h, p, xdir, ydir;
            return h = 18, p = padding, w = w, xdir = "left" === side ? 1 : -1, ydir = 1, 0 !== yOffset && (ydir = Math.abs(yOffset) / yOffset), 
            yOffset || (yOffset = 0), [ "m0 0", "l" + xdir + " 0", "l0 " + (yOffset + ydir), "l" + -xdir * (p + 1) + " 0", "l0 " + (-h / 2 - ydir), "l" + -xdir * w + " 0", "l0 " + h, "l" + xdir * w + " 0", "l0 " + (-h / 2 - ydir), "l" + xdir * (p - 1) + " 0", "l0 " + (-yOffset + ydir), "l1 0", "z" ].join("");
        },
        preventOverlapping: function(positions) {
            var abscissas, getNeighbours, h, offset;
            return h = 18, abscissas = {}, positions.forEach(function(p) {
                var _name;
                return abscissas[_name = p.x] || (abscissas[_name] = {
                    left: [],
                    right: []
                }), abscissas[p.x][p.side].push(p);
            }), getNeighbours = function(side) {
                var foundNeighbour, neighbourhood, neighbours, neighboursForX, p, sides, x, y, _ref;
                neighbours = [];
                for (x in abscissas) if (sides = abscissas[x], 0 !== sides[side].length) {
                    for (neighboursForX = {}; sides[side].length > 0; ) {
                        p = sides[side].pop(), foundNeighbour = !1;
                        for (y in neighboursForX) neighbourhood = neighboursForX[y], +y - h <= (_ref = p.y) && +y + h >= _ref && (neighbourhood.push(p), 
                        foundNeighbour = !0);
                        foundNeighbour || (neighboursForX[p.y] = [ p ]);
                    }
                    neighbours.push(neighboursForX);
                }
                return neighbours;
            }, offset = function(neighboursForAbscissas) {
                var abs, n, neighbours, start, step, xNeighbours, y;
                step = 20;
                for (abs in neighboursForAbscissas) {
                    xNeighbours = neighboursForAbscissas[abs];
                    for (y in xNeighbours) neighbours = xNeighbours[y], n = neighbours.length, 1 !== n ? (neighbours = neighbours.sort(function(a, b) {
                        return a.y - b.y;
                    }), start = n % 2 === 0 ? -(step / 2) * (n / 2) : -(n - 1) / 2 * step, neighbours.forEach(function(neighbour, i) {
                        return neighbour.labelOffset = start + step * i;
                    })) : neighbours[0].labelOffset = 0;
                }
            }, offset(getNeighbours("left")), offset(getNeighbours("right")), positions;
        },
        getTooltipHandlers: function(options) {
            return "scrubber" === options.tooltip.mode ? {
                onChartHover: angular.bind(this, this.showScrubber)
            } : {
                onMouseOver: angular.bind(this, this.onMouseOver),
                onMouseOut: angular.bind(this, this.onMouseOut)
            };
        },
        styleTooltip: function(d3TextElement) {
            return d3TextElement.attr({
                "font-family": "monospace",
                "font-size": 10,
                fill: "white",
                "text-rendering": "geometric-precision"
            });
        },
        addTooltips: function(svg, dimensions, axesOptions) {
            var h, height, p, w, width, xTooltip, y2Tooltip, yTooltip;
            return width = dimensions.width, height = dimensions.height, width = width - dimensions.left - dimensions.right, 
            height = height - dimensions.top - dimensions.bottom, w = 24, h = 18, p = 5, xTooltip = svg.append("g").attr({
                id: "xTooltip",
                "class": "xTooltip",
                opacity: 0
            }), xTooltip.append("path").attr("transform", "translate(0," + (height + 1) + ")"), 
            this.styleTooltip(xTooltip.append("text").style("text-anchor", "middle").attr({
                width: w,
                height: h,
                transform: "translate(0," + (height + 19) + ")"
            })), yTooltip = svg.append("g").attr({
                id: "yTooltip",
                "class": "yTooltip",
                opacity: 0
            }), yTooltip.append("path"), this.styleTooltip(yTooltip.append("text").attr({
                width: h,
                height: w
            })), null != axesOptions.y2 ? (y2Tooltip = svg.append("g").attr({
                id: "y2Tooltip",
                "class": "y2Tooltip",
                opacity: 0,
                transform: "translate(" + width + ",0)"
            }), y2Tooltip.append("path"), this.styleTooltip(y2Tooltip.append("text").attr({
                width: h,
                height: w
            }))) : void 0;
        },
        onMouseOver: function(svg, event, axesOptions) {
            return this.updateXTooltip(svg, event, axesOptions.x), "y2" === event.series.axis ? this.updateY2Tooltip(svg, event, axesOptions.y2) : this.updateYTooltip(svg, event, axesOptions.y);
        },
        onMouseOut: function(svg) {
            return this.hideTooltips(svg);
        },
        updateXTooltip: function(svg, _arg, xAxisOptions) {
            var color, datum, label, series, textX, x, xTooltip, _f;
            return x = _arg.x, datum = _arg.datum, series = _arg.series, xTooltip = svg.select("#xTooltip"), 
            xTooltip.transition().attr({
                opacity: 1,
                transform: "translate(" + x + ",0)"
            }), _f = xAxisOptions.tooltipFormatter, textX = _f ? _f(datum.x) : datum.x, label = xTooltip.select("text"), 
            label.text(textX), color = angular.isFunction(series.color) ? series.color(datum, series.values.indexOf(datum)) : series.color, 
            xTooltip.select("path").style("fill", color).attr("d", this.getXTooltipPath(label[0][0]));
        },
        getXTooltipPath: function(textElement) {
            var h, p, w;
            return w = Math.max(this.getTextBBox(textElement).width, 15), h = 18, p = 5, "m-" + w / 2 + " " + p + " l0 " + h + " l" + w + " 0 l0 " + -h + "l" + (-w / 2 + p) + " 0 l" + -p + " -" + h / 4 + " l" + -p + " " + h / 4 + " l" + (-w / 2 + p) + " 0z";
        },
        updateYTooltip: function(svg, _arg, yAxisOptions) {
            var color, datum, label, series, textY, w, y, yTooltip, _f;
            return y = _arg.y, datum = _arg.datum, series = _arg.series, yTooltip = svg.select("#yTooltip"), 
            yTooltip.transition().attr({
                opacity: 1,
                transform: "translate(0, " + y + ")"
            }), _f = yAxisOptions.tooltipFormatter, textY = _f ? _f(datum.y) : datum.y, label = yTooltip.select("text"), 
            label.text(textY), w = this.getTextBBox(label[0][0]).width + 5, label.attr({
                transform: "translate(" + (-w - 2) + ",3)",
                width: w
            }), color = angular.isFunction(series.color) ? series.color(datum, series.values.indexOf(datum)) : series.color, 
            yTooltip.select("path").style("fill", color).attr("d", this.getYTooltipPath(w));
        },
        updateY2Tooltip: function(svg, _arg, yAxisOptions) {
            var color, datum, label, series, textY, w, y, y2Tooltip, _f;
            return y = _arg.y, datum = _arg.datum, series = _arg.series, y2Tooltip = svg.select("#y2Tooltip"), 
            y2Tooltip.transition().attr("opacity", 1), _f = yAxisOptions.tooltipFormatter, textY = _f ? _f(datum.y) : datum.y, 
            label = y2Tooltip.select("text"), label.text(textY), w = this.getTextBBox(label[0][0]).width + 5, 
            label.attr({
                transform: "translate(7, " + (parseFloat(y) + 3) + ")",
                w: w
            }), color = angular.isFunction(series.color) ? series.color(datum, series.values.indexOf(datum)) : series.color, 
            y2Tooltip.select("path").style("fill", color).attr({
                d: this.getY2TooltipPath(w),
                transform: "translate(0, " + y + ")"
            });
        },
        getYTooltipPath: function(w) {
            var h, p;
            return h = 18, p = 5, "m0 0l" + -p + " " + -p + " l0 " + (-h / 2 + p) + " l" + -w + " 0 l0 " + h + " l" + w + " 0 l0 " + (-h / 2 + p) + "l" + -p + " " + p + "z";
        },
        getY2TooltipPath: function(w) {
            var h, p;
            return h = 18, p = 5, "m0 0l" + p + " " + p + " l0 " + (h / 2 - p) + " l" + w + " 0 l0 " + -h + " l" + -w + " 0 l0 " + (h / 2 - p) + " l" + -p + " " + p + "z";
        },
        hideTooltips: function(svg) {
            return svg.select("#xTooltip").transition().attr("opacity", 0), svg.select("#yTooltip").transition().attr("opacity", 0), 
            svg.select("#y2Tooltip").transition().attr("opacity", 0);
        }
    };
} ]);