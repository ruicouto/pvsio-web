/** @module EmuchartsEditor */
/**
 * EmuchartsEditor handles rendering of emuchart diagrams.
 * This is code is a re-engineered version of stateMachine.js implemented in branch emulink-commented
 * @author Paolo Masci
 * @date 14/05/14 5:16:13 PM
 */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, d3, require, $, brackets, window, _, Promise, document, FileReader*/

define(function (require, exports, module) {
	"use strict";
    
    var d3 = require("d3/d3"),
        eventDispatcher = require("util/eventDispatcher"),
        EditorModeUtils = require("plugins/emulink/EmuchartsEditorModes"),
        Emucharts = require("plugins/emulink/Emucharts"),
        displayRename       = require("plugins/emulink/forms/displayRename");
    
    // the emuchart data
    var emucharts;

    // constants for drawing states
    var width  = 900;
    var height = 800;
    var colors = d3.scale.category10();
    var fontSize = 12;
    
    // constants for drawing transitions
    var stroke_width_large = "20px";
    var stroke_width_highlighted = "1.5px";
    var stroke_width_normal = "1px";
    
    // variables used for animation
    var selected = d3.map(); // stores the ids of selected states and transitions
    // mouse event vars used for identifying gestures like creating a new transition
    var mousedown = { node: null, path: null };
    var mouseup = { node: null, path: null };
    var mouseover = { node: null, path: null };
    var mousedrag = { node: null, path: null };
    var preventCreation = false;
    var preventRenaming = false;
    function resetMouseVars() {
        mousedown = { node: null, path: null };
        mouseup = { node: null, path: null };
        mouseover = { node: null, path: null };
        mousedrag = { node: null, path: null };
    }
    var drag_line; // drag line used when creating new transitions
    
    // editor modes
    var MODE = new EditorModeUtils();
    var editor_mode = MODE.BROWSE();
    
	/**
	 * Constructor
	 * @memberof EmuchartsEditor
	 */
    function EmuchartsEditor(emucharts) {
        this.emucharts = emucharts;
        eventDispatcher(this);
    }
    
    
	/**
	 * Interface function for setting editor mode
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.set_editor_mode = function (mode) {
        editor_mode = mode;
        var event = {type: "emuCharts_editorModeChanged", mode: editor_mode};
        this.fire(event);
    };

    
    
	/**
	 * Utility function for trimming values so that they don't exceed a given range min-max
     * @returns trimmed value
	 * @memberof EmuchartsEditor
	 */
    function trim(val, min, max) {
        return (val < max) ? ((val > min) ? val : min) : max;
    }
    
	/**
	 * Utility function for creating an empty svg area and definitions
     * @returns reference to the transitions redrawn (svg element)
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.newSVG = function () {
        var _this = this;
        
        // create svg area
        d3.select("#ContainerStateMachine")
            .append("svg")
            .attr("width", width).attr("height", height)
            .style("background", "#fffcec")
            .append("svg:defs")
            .append("svg:marker")
            .attr("id", "end-arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 9)
            .attr("markerWidth", 16)
            .attr("markerHeight", 16)
            .attr("orient", "auto")
            .append("svg:path")
            .attr("d", "M4,0 L1,-3 L10,0 L1,3 L4,0")
            .attr("fill", "black");
        
        d3.select("#ContainerStateMachine").select("svg").select("defs")
            // arrow for drag line
            .append("svg:marker")
            .attr("id", "drag-arrow")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 9)
            .attr("markerWidth", 16)
            .attr("markerHeight", 16)
            .attr("orient", "auto")
            .append("svg:path")
            .attr("d", "M4,0 L1,-3 L10,0 L1,3 L4,0")
            .attr("fill", "black");
        
        drag_line = d3.select("#ContainerStateMachine").select("svg")
            .append("svg:path")
            .attr("id", "dragline")
            .attr("class", "link dragline hidden")
            .attr("d", "M0,0L0,0");
        
        d3.select("#ContainerStateMachine").select("svg").append("svg:g").attr("id", "Transitions");
        d3.select("#ContainerStateMachine").select("svg").append("svg:g").attr("id", "States");
        
        var mouseClick = function () {
            if (editor_mode === MODE.ADD_STATE() && !_this.preventCreation) {
                var m = d3.mouse(d3.select("#ContainerStateMachine svg").select("#States").node());
                // create a new node at the mouse position and add it to emucharts
                _this.emucharts.add_node({
                    x: m[0],
                    y: m[1]
                });
                // render states
                _this.renderStates();
            }
            _this.preventCreation = false;
        };
        var zoom = d3.behavior.zoom().scaleExtent([0.5, 10]).on("zoom", function () {
            if (_this.emucharts && _this.emucharts.nodes && _this.emucharts.nodes.empty() === false) {
                _this.preventCreation = true;
                d3.select("#ContainerStateMachine svg").select("#States")
                    .attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                d3.select("#ContainerStateMachine svg").select("#Transitions")
                    .attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
                d3.select("#ContainerStateMachine svg").select("#dragline")
                    .attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
            }
        });
        
        d3.select("#ContainerStateMachine svg")
            .on("click", mouseClick)
            .call(zoom);

        // return reference to svg
        return d3.select("#ContainerStateMachine").select("svg");
    };

    
	/**
	 * Utility function to generate formatted labels for transitions
     * @returns labels, as a formatted string
	 * @memberof EmuchartsEditor
	 */
    function labelToString(label) {
        var ans = "";
        if (label.listConditions) {
            label.listConditions.forEach(function (cond) { ans += cond + "; "; });
            ans = " [ " + ans + " ] ";
        }
        if (label.listOfOperations) {
            label.listOfOperations.forEach(function (item) { ans += item + "; "; });
            ans = " { " + ans + " } ";
        }
        return ans;
    }
    
	/**
	 * Utility function to refresh rendered transitions.
     * @returns reference to the updated svg elements
	 * @memberof EmuchartsEditor
	 */
    function refreshTransitions(transitions) {
        var label;
        // refresh paths and labels
        transitions.selectAll(".path").attr("d", function (edge) {
            // refresh transition path
            if (edge.target.x === edge.source.x && edge.target.y === edge.source.y) {
                // this is a self-edge
                // refresh transition label
                label = d3.select(this.parentNode).select(".tlabel");
                label.text(function (edge) {
                    return edge.name + labelToString(edge);
                });
                // adjust text position
                label.attr("x", function (edge) {
                    if (edge.target.id === edge.source.id) {
                        // self-edge
                        return edge.source.x + 32;
                    }
                    // else do nothing -- textpath will take care of placing the text
                    return "";
                }).attr("y", function (edge) {
                    if (edge.target.id === edge.source.id) {
                        // self-edge
                        return edge.source.y - 32;
                    }
                    // else do nothing -- textpath will take care of placing the text
                    return "";
                });
                // redraw self-edge
                return "M" + (edge.source.x + edge.source.width / 2 - 8) + ','
                        + (edge.source.y - edge.source.height / 2 - 2) + "q 64 -16 16 16";
            } else {
                // not a self-edge
                // refresh transition label
                label = d3.select(this.parentNode.lastChild.firstChild);
                label.text(function (edge) {
                    return edge.name + labelToString(edge);
                });
                // refresh path
                var dx = edge.target.x - edge.source.x;
                var dy = edge.target.y - edge.source.y;
                var dist = Math.sqrt(dx * dx + dy * dy);
                var sourceX = edge.source.x;
                var sourceY = edge.source.y;
                var targetX = edge.target.x;
                var targetY = edge.target.y;
                var sourcetWidth = edge.source.name.length * fontSize;
                var sourceHeight = edge.source.height;
                var targetWidth  = edge.target.name.length * fontSize;
                var targetHeight = edge.target.height;

                // to adjust the arrow pointing at the target, we reason using Cartesian quadrants:
                // the source node is at the center of the axes, and the target is in one of the quadrants
                //  II  |  I
                // -----s-----
                // III  |  IV
                // NOTE: SVG has the y axis inverted with respect to the Cartesian y axis
                if (dx >= 0 && dy < 0) {
                    // target in quadrant I
                    // for targets in quadrant I, round links draw convex arcs
                    // --> place the arrow on the left side of the target
                    targetX -= targetWidth * 0.6;
                } else if (dx < 0 && dy < 0) {
                    // target in quadrant II
                    // for targets in quadrant I, round links draw concave arcs
                    // --> place the arrow at the bottom-right corner of the target
                    targetY += targetHeight * 0.6;
                } else if (dx < 0 && dy >= 0) {
                    // target in quadrant III
                    // for targets in quadrant IV, round links draw concave arcs
                    // --> place arrow end on the top-right corner of the target
                    targetX += targetWidth * 0.6;
                } else if (dx >= 0 && dy >= 0) {
                    // target in quadrant IV
                    // for targets in quadrant IV, round links draw convex arcs
                    // --> place arrow end at the top-left corner of the target
                    targetY -= targetHeight * 0.6;
                }
                return "m" + sourceX + ',' + sourceY + "A" + dist + ","
                        + dist + " 0 0,1 " + targetX + "," + targetY;
                // this other code draws straight lines
                //return "m" + sourceX + ',' + sourceY + 'L' + targetX + ',' + targetY;
            }
        });
        return transitions;
    }
        
    /**
	 * Utility function for removing transitions from the SVG
     * @returns reference to the updated svg elements
	 * @memberof EmuchartsEditor
	 */
    function removeTransitions(exitedTransitions) {
        return exitedTransitions
                    .transition().duration(320)
                    .style("stroke-width", stroke_width_large)
                    .style("opacity", 0).remove();
    }

    /**
	 * Utility function for drawing transitions
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.renderTransitions = function () {
        var _this = this;
        var svg = d3.select("#ContainerStateMachine").select("svg");
        
        /**
         * Utility function for drawing transitions
         * @returns a reference to the entered transitions
         */
        var drawTransitions = function (enteredTransitions) {
            enteredTransitions = enteredTransitions.append("svg:g")
                .classed("transition", true)
                .attr("id", function (edge) { return edge.id; });

            // visiblePath is the actual path visible to the user
            var visiblePath = enteredTransitions.append("svg:path").classed("path", true)
                .attr("id", function (edge) { return "path_" + edge.id; })
                .attr("fill", "none")
                .style("stroke", "black")
                .style("stroke-width", stroke_width_normal)
                .style("markerUnits", "userSpaceOnUse")
                .style("marker-start", "url(#start-arrow)")
                .style("marker-end", "url(#end-arrow)");

            // selection path is used to ease selection with the mouse (it's wide)
            var selectionPath = enteredTransitions.append("svg:path").classed("path", true)
                .attr("id", function (edge) {return "selectionPath_" + edge.id; })
                .style("opacity", "0")
                .attr("fill", "none")
                .style("stroke", "grey")
                .style("stroke-width", stroke_width_large)
                .style("markerUnits", "userSpaceOnUse")
                .style("cursor", "pointer");

            // labels are drawn using both text and textpath
            // the former is for self-edges, the latter for all other edges
            var text = enteredTransitions.append("svg:text").classed("tlabel", true)
                .attr("id", function (d) { return "tlabel_" + d.id; })
                .style("font", "10px sans-serif")
                .style("text-rendering", "optimizeLegibility")
                .style("cursor", "pointer") // change cursor shape
                .attr("x", function (edge) {
                    if (edge.target.id === edge.source.id) {
                        // self-edge
                        return edge.source.x + 32;
                    }
                    // else do nothing -- textpath will take care of placing the text
                    return "";
                })
                .attr("y", function (edge) {
                    if (edge.target.id === edge.source.id) {
                        // self-edge
                        return edge.source.y - 32;
                    }
                    // else do nothing -- textpath will take care of placing the text
                    return "";
                })
                .text(function (edge) {
                    if (edge.target.id === edge.source.id) {
                        // text for self edges is rendered as standard text field
                        return edge.name + labelToString(edge);
                    }
                    // text for other edges is rendered as textpath
                    return "";
                });

            var textPath = enteredTransitions.append("svg:text").classed("tlabel", true)
                .attr("id", function (edge) { return "tlabel_" + edge.id; })
                .style("font", "10px sans-serif")
                .style("text-rendering", "optimizeLegibility")
                .style("text-anchor", "middle")
                .append("textPath")
                .attr("xlink:href", function (edge) { return "#path_" + edge.id; })
                .attr("startOffset", "50%")
                .style("cursor", "pointer") // change cursor shape
                .text(function (edge) {
                    if (edge.target.id === edge.source.id) {
                        // text for self edges is rendered as standard text field
                        return "";
                    }
                    // text for other edges is rendered here
                    return edge.name + labelToString(edge);
                });

            return refreshTransitions(enteredTransitions);
        };
        var mouseOver = function (edge) {
            if (editor_mode === MODE.BROWSE() || editor_mode === MODE.RENAME()) {
                d3.select(this.firstChild).style("stroke-width", stroke_width_highlighted);
            }
        };
        var mouseOut = function (edge) {
            if (editor_mode === MODE.BROWSE() || editor_mode === MODE.RENAME()) {
                d3.select(this.firstChild).style("stroke-width", stroke_width_normal);
            }
        };
        var mouseClick = function (edge) {
            if (editor_mode === MODE.RENAME()) {
                // update mouse variables
                mousedown.edge = edge;
                // popup rename window
                var oldName = edge.name;
                var labels = [];
                labels.push(edge.name + "  ("
                            + edge.source.name + "->"
                            + edge.target.name + ")");
                displayRename.create({
                    header: "Please enter new label...",
                    textLabel: "Transition",
                    currentLabels: labels,
                    buttons: ["Cancel", "Rename"]
                }).on("rename", function (e, view) {
                    var transitionLabel = e.data.labels.get("newLabel");
                    if (transitionLabel && transitionLabel.value !== "") {
                        _this.rename_transition(edge.id, transitionLabel);
                        view.remove();
                    }
                }).on("cancel", function (e, view) {
                    // just remove rename window
                    view.remove();
                });
            }
        };
        
        if (!this.emucharts || !this.emucharts.getEdges()) { return; }
        // create svg element, if needed
        if (svg.empty()) { svg = this.newSVG(); }
        var edges = this.emucharts.getEdges().values();
        if (edges) {
            // create a group of svg elements for transitions, and bind them to data
            var transitions = svg.select("#Transitions").selectAll(".transition")
                                    .data(edges, function (edge) { return edge.id; });
            var enteredTransitions = drawTransitions(transitions.enter());
            var exitedTransitions = removeTransitions(transitions.exit());
            enteredTransitions
                .on("mouseover", mouseOver)
                .on("mouseout", mouseOut)
                .on("click", mouseClick);
        }
    };
    
	/**
	 * Utility function to refresh rendered states.
     * @returns reference to the updated svg elements
	 * @memberof EmuchartsEditor
	 */
    function refreshStates(states) {
        // refresh box size and position, if needed
        states.select(".state_box").attr("width", function (node) {
            var estimatedTextWidth = node.name.length * fontSize;
            return (estimatedTextWidth > node.width) ? estimatedTextWidth : node.width;
        }).attr("x", function (node) {
            var estimatedTextWidth = node.name.length * fontSize;
            return (estimatedTextWidth < 36) ? -18
                    : -(node.name.length * fontSize) / 2;
        });
        // refresh move tool, if needed
        states.select(".state_move").attr("x", function (node) {
            var estimatedTextWidth = node.name.length * fontSize;
            return (estimatedTextWidth < 36) ? 0
                    : (node.name.length * fontSize) / 2 - 18;
        });
        // refresh labels
        states.select(".state_label").text(function (node) {
            return node.name;
        });
        return states;
    }

    /**
	 * Utility function for drawing states
     * @returns reference to the updated svg elements
	 * @memberof EmuchartsEditor
	 */
    function drawStates(enteredStates) {
        enteredStates = enteredStates.append("svg:g").classed("state", true)
            .attr("id", function (node) { return node.id; })
            .attr("transform", function (node) {
                return "translate(" + node.x + " " + node.y + ") scale(1.0)";
            });
        // draw states (selectAll will automatically iterate for all states)
        var state = enteredStates.append("svg:rect").classed("state_box", true)
            .attr("id", function (node) { return "box_" + node.id; })
            .attr("width", function (node) {
                // adjust node width if needed
                var estimatedTextWidth = node.name.length * fontSize;
                return (estimatedTextWidth > node.width) ? estimatedTextWidth : node.width;
            })
            .attr("height", function (node) { return node.height; })
            // translate x,y so that the box is centered there
            .attr("x", function (node) {
                var estimatedTextWidth = node.name.length * fontSize;
                return (estimatedTextWidth < 36) ? -18
                        : -(node.name.length * fontSize) / 2;
            })
            .attr("y", function (node) { return -node.width / 2; })
            .attr("rx", 6).attr("ry", 6) // draw rounded corners
            .style("opacity", "0.9") // make the node slightly transparent
            .style("cursor", "pointer") // change cursor shape on mouse over
            .style("fill", function (node) { // fill the box, avoid black
                return (node.id === 0) ? d3.rgb(colors(node.id)).brighter().toString()
                            : colors(node.id);
            })
            .style("stroke", function (node) { // draw a frame around the box
                return d3.rgb(colors(node.id)).darker().toString();
            });
        // draw move tool for boxes
        var moveTool = enteredStates.append("svg:rect").classed("state_move", true)
            .attr("id", function (node) { return "resize_" + node.id; })
            .attr("width", 20).attr("height", 20)
            // place the resize tool at the lower right corner of the box
            .attr("x", function (node) { // FIXME: use symbolic names rather than embedded constants!
                var estimatedTextWidth = node.name.length * fontSize;
                return (estimatedTextWidth < 36) ? 0
                        : (node.name.length * fontSize) / 2 - 18;
            })
            .attr("y", function (node) { return node.height / 2 - 18; })
            .attr("rx", 2).attr("ry", 2) // draw rouded corners
            .style("stroke", "gray") // set border colour
            .style("stroke-width", "2") // set border size
            .style("fill", "white") // set fill colour
            .style("opacity", "0.4") // make the resize tool slightly transparent
            .style("cursor", "move"); // change cursor shape on mouse over
        // draw state names
        var label = enteredStates.append("svg:text").classed("state_label", true)
            .attr("id", function (node) { return "label_" + node.id; })
            .attr("text-anchor", "middle")
            .style("font", "12px sans-serif")
            .style("text-rendering", "optimizeLegibility")
            .text(function (node) { return node.name; });
        return enteredStates;
    }
    
    /**
	 * Utility function for removing states from the SVG
     * @returns reference to the updated svg elements
	 * @memberof EmuchartsEditor
	 */
    function removeStates(exitedStates) {
        return exitedStates
                    .transition().duration(320)
                    .style("opacity", 0).remove();
    }

    /**
	 * Utility function for drawing states
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.renderStates = function () {
        var _this = this;
        var svg = d3.select("#ContainerStateMachine").select("svg");
        
        // mouse event handlers
        var dragStart = function (node) {
            // stop propagation -- needed to avoid zoom & translate events on svg
            d3.event.sourceEvent.stopPropagation();
            // update mouse variables
            mousedrag.node = node;
            if (editor_mode === MODE.ADD_TRANSITION() && mousedrag.node) {
                // create an arrow from the selected node to the cursor position
                drag_line.classed("hidden", false)
                    .style("marker-end", "url(#drag-arrow)")
                    .attr("d", "M" + mousedrag.node.x + "," + mousedrag.node.y
                                + "L" + (mousedrag.node.x + d3.mouse(this)[0])
                                + "," + (mousedrag.node.y + d3.mouse(this)[1]));
            }
        };
        var dragNode = function (node) {
            if (editor_mode === MODE.BROWSE() || editor_mode === MODE.ADD_STATE()
                    || editor_mode === MODE.RENAME()) {
                _this.preventCreation = true;
                _this.preventRenaming = true;
                // update node position
                node.x = trim(node.x + d3.event.dx, node.width, width - node.width);
                node.y = trim(node.y + d3.event.dy, node.height / 2, height - node.height / 2);
                d3.select(this).attr("transform",
                                     "translate(" + node.x + "," + node.y + ") scale(1.1) ");
                // update all edges connected to this node
                var updatedTransitions = d3.select("#ContainerStateMachine")
                        .select("#Transitions").selectAll(".transition")
                        .filter(function (edge) {
                            var updated = false;
                            if (edge.source.id === node.id) {
                                edge.source.x = node.x;
                                edge.source.y = node.y;
                                updated = true;
                            }
                            if (edge.target.id === node.id) {
                                edge.target.x = node.x;
                                edge.target.y = node.y;
                                updated = true;
                            }
                            return updated;
                        });
                refreshTransitions(updatedTransitions);
            } else if (editor_mode === MODE.ADD_TRANSITION() && mousedrag.node) {
                drag_line.attr("d", "M" + mousedrag.node.x + "," + mousedrag.node.y
                                + "L" + (mousedrag.node.x + d3.mouse(this)[0])
                                + "," + (mousedrag.node.y + d3.mouse(this)[1]));
            }
        };
        var dragEnd = function (node) {
            if (editor_mode === MODE.ADD_TRANSITION() && mousedrag.node) {
                // add new transition to emuchart
                _this.emucharts.add_edge({
                    name: "tick",
                    source: mousedrag.node,
                    target: mouseover.node
                });
                // render transitions
                _this.renderTransitions();
                // hide drag arrow & reset mouse vars
                drag_line.classed("hidden", true).style("marker-end", "");
            }
            // mouse variable updated by mouse click event
        };
        var mouseOver = function (node) {
            // update mouse variables
            mouseover.node = node;
            // highlight node
            this.setAttribute("transform", this.getAttribute("transform").replace("scale(1.0)", "scale(1.1)"));
            if (editor_mode === MODE.ADD_TRANSITION() && mousedrag.node) {
                if (mousedrag.node.id !== node.id) {
                    // change colour of drag arrow to give a cue that a mouse release will trigger the creation of a new transition between nodes
                    drag_line.style("stroke", colors(node.id));
                    d3.select("#drag-arrow path").style("fill", colors(node.id));
                } else {
                    drag_line.style("stroke", "black");
                    d3.select("#drag-arrow path").style("fill", "black");
                }
            }
        };
        var mouseOut = function (node) {
            // update mouse variables
            mouseover.node = null;
            // restore node size
            this.setAttribute("transform", this.getAttribute("transform").replace("scale(1.1)", "scale(1.0)"));
            if (editor_mode === MODE.ADD_TRANSITION()) {
                // change colour of drag arrow to the default (black)
                drag_line.style("stroke", "black");
                d3.select("#drag-arrow path").style("fill", "black");
            }
        };
        var mouseClick = function (node) {
            // prevent node creation -- we are clicking on an exiting node
            _this.preventCreation = true;
            if (editor_mode === MODE.RENAME() && !_this.preventRenaming && mouseover.node) {
                // update node variables
                mousedown.node = mouseover.node;
                // popup rename window
                var oldName = node.name;
                var labels = [];
                labels.push(node.name + "  (id: " + node.id + ")");

                displayRename.create({
                    header: "Please enter new label...",
                    textLabel: "State",
                    currentLabels: labels,
                    buttons: ["Cancel", "Rename"]
                }).on("rename", function (e, view) {
                    var stateLabel = e.data.labels.get("newLabel");
                    if (stateLabel && stateLabel.value !== "") {
                        _this.rename_state(node.id, stateLabel);
                        view.remove();
                    }
                }).on("cancel", function (e, view) {
                    // just remove rename window
                    view.remove();
                });
            }
            if (mousedrag.node) { mousedrag.node = null; }
            _this.preventRenaming = false;
        };


        if (!this.emucharts || !this.emucharts.getNodes()) { return; }
        var nodes = this.emucharts.getNodes().values();
        if (nodes) {
            if (svg.empty()) { svg = this.newSVG(); }
            // create a group of svg elements for states, and bind them to data
            var states = svg.select("#States").selectAll(".state")
                            .data(nodes, function (node) { return node.id; });
            var enteredStates = drawStates(states.enter());
            var exitedStates  = removeStates(states.exit());
            var drag = d3.behavior.drag().origin(function (node) {
                return node;
            });
            drag.on("dragstart", dragStart)
                .on("drag", dragNode)
                .on("dragend", dragEnd);
            enteredStates.call(drag)
                .on("mouseover", mouseOver)
                .on("mouseout", mouseOut)
                .on("click", mouseClick);
        }
    };
    
    
    /**
	 * Interface function for rendering the emuchart
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.render = function () {
        this.renderTransitions();
        return this.renderStates();
    };

    /**
	 * Returns a fresh state name
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.getFreshStateName = function () {
        return this.emucharts.getFreshStateName();
    };
    
    /**
	 * Returns a fresh transition name
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.getFreshTransitionName = function () {
        return this.emucharts.getFreshTransitionName();
    };
    
    /**
	 * Returns an array containing the current set of states in the diagram
     * Each states is given as a pair { name, id }
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.getStates = function () {
        return this.emucharts.getStates();
    };

    /**
	 * Returns an array containing the current set of states in the diagram
     * Each transition is given as a 4-tuple { name, id, source, target }
     * where source and target are pairs { name, id }
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.getTransitions = function () {
        return this.emucharts.getTransitions();
    };
    
    /**
     * utility function to rename transitions
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.rename_transition = function (transitionID, newLabel) {
        this.emucharts.rename_edge(transitionID, newLabel);
        var transitions = d3.select("#ContainerStateMachine")
                        .select("#Transitions").selectAll(".transition")
                        .filter(function (transition) { return transition.id === transitionID; });
        // refresh transitions
        refreshTransitions(transitions);
    };

    /**
     * utility function to rename states
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.rename_state = function (stateID, newLabel) {
        this.emucharts.rename_node(stateID, newLabel);
        var states = d3.select("#ContainerStateMachine")
            .select("#States").selectAll(".state")
            .filter(function (state) { return state.id === stateID; });
        // refresh states
        refreshStates(states);
    };

    /**
	 * Interface function for adding states
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.add_state = function (stateName) {
        // FIXME: need to adjust the position in the case svg is translated
        this.emucharts.add_node({
            name: stateName
        });
        return this.renderStates();
    };
    
    /**
	 * Interface function for deleting states and all transitions incoming/outgoing to this state
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.delete_state = function (stateID) {
        var _this = this;
        this.emucharts.nodes.remove(stateID);
        var edges = [];
        this.emucharts.edges.forEach(function (key) {
            var edge = _this.emucharts.edges.get(key);
            if ((edge.source && edge.source.id === stateID)
                    || (edge.target && edge.target.id === stateID)) {
                edges.push(edge.id);
            }
        });
        edges.forEach(function (edge) {
            _this.emucharts.edges.remove(edge);
        });
        this.renderTransitions();
        return this.renderStates();
    };

    /**
	 * Interface function for deleting transitions
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.delete_transition = function (transitionID) {
        this.emucharts.edges.remove(transitionID);
        return this.renderTransitions();
    };

    /**
	 * Interface function for adding transitions
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.add_transition = function (transitionName, from, to) {
        var source = this.emucharts.nodes.get(from);
        var target = this.emucharts.nodes.get(to);
        if (source && target) {
            // FIXME: need to adjust the position in the case svg is translated
            this.emucharts.add_edge({
                name: transitionName,
                source: source,
                target: target
            });
            return this.renderTransitions();
        } else {
            // FIXME: improve interaction & feedback
            alert("invalid nodes");
        }
    };

    /**
	 * Interface function for deleting transitions
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.delete_transitions = function (transitionID) {
        this.emucharts.nodes.remove(transitionID);
        return this.renderTransitions();
    };

    /**
	 * Interface function for adding new constant definitions
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.add_constant = function (newConstant) {
        return this.emucharts.add_constant(newConstant);
    };
    
    /**
	 * Interface function for adding new state variables
	 * @memberof EmuchartsEditor
	 */
    EmuchartsEditor.prototype.add_variable = function (newVariable) {
        return this.emucharts.add_variable(newVariable);
    };

    module.exports = EmuchartsEditor;
});