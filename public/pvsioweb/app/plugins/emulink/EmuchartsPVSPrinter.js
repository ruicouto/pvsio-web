/** @module EmuchartsPVSPrinter */
/**
 * EmuchartsPVSPrinter provides functions to generate a pvs theory for emucharts
 * The printer knows only the theory name, all expressions within the theory are provided as function arguments
 * @author Paolo Masci
 * @date 27/05/14 9:38:13 AM
 */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, d3 */
define(function (require, exports, module) {
	"use strict";
    
    var theory_name;

    
    /**
	 * Constructor
	 */
    function EmuchartsPVSPrinter(name) {
        theory_name = name;
        return this;
    }
    
    /**
     * Prints PVS definitions for Emuchart states
     */
    EmuchartsPVSPrinter.prototype.print_states = function (emuchart) {
        var states = emuchart.states;
        var ans = "  %-- machine states\n  MachineState: TYPE";
        if (states && states.length > 0) {
            ans += " = { ";
            states.forEach(function (state) {
                ans += state.name + ", ";
            });
            ans = ans.substr(0, ans.length - 2) + " }";
        }
        return ans + "\n";
    };
    
    /**
     * Parser for identifying transition names for transitions given in the
     * form name [ condition ] { actios }, where conditions and actions are optionals
     */
    function parseTransitionName(transition) {
        var pos = transition.indexOf("[");
        if (pos > 0) { return transition.substr(0, pos).trim(); }
        pos = transition.indexOf("{");
        if (pos > 0) { return transition.substr(0, pos).trim(); }
        return transition.trim();
    }
    
    /**
     * Parser for transitions given in the form name [ condition ] { actios },
     * where name is the transition name, and conditions and actions are optionals
     */
    function parseTransition(transition) {
        var ans = {
            name: "",
            cond: "",
            actions: [],
            from: transition.source.id,
            to: transition.target.id
        };
        var sqOpen = transition.name.indexOf("[");
        var sqClose = transition.name.indexOf("]");
        var curOpen = transition.name.indexOf("{");
        var curClose = transition.name.indexOf("}");
        ans.name = parseTransitionName(transition.name);
        if (sqOpen >= 0 && sqClose > sqOpen) {
            ans.cond = transition.name.substring(sqOpen + 1, sqClose).trim();
        }
        if (curOpen >= 0 && curClose > curOpen) {
            var actions = transition.name.substring(curOpen + 1, curClose).split(";");
            actions.forEach(function (action) {
                var a = action.trim();
                if (a !== "") {
                    ans.actions.push(a);
                }
            });
            
        }
        return ans;
    }

    /**
     * identifies state variables on the left-hand side of equalities/assignment
     */
    function indexOfStateVariableLF(v, expr) {
        if (v && expr) {
            var pos = expr.indexOf(v);
            if (pos >= 0) {
                // check that we are not accidentally parsing a substring of a longer var name
                // if it's a genuine var name on the left-hand side of equalities/assignment, then
                // the variable name is immediately preceeded by space or ; or ( 
                // and immediately succeded by a comparison operator or space
                var before = expr.substr(0, pos).trim();
                var after  = expr.substr(pos + v.length + 1).trim();
                if ((before === "" || before.indexOf(";") === before.length - 1
                                    || before.indexOf("(") === before.length - 1)
                        && (after === "" || after.indexOf(">") === 0
                                || after.indexOf("=") === 0 || after.indexOf("<") === 0)) {
                    // it's a variable
                    return pos;
                }
            }
        }
        return -1;
    }
    
    /**
     * identifies state variables on the right-hand side of equalities/assignment
     */
    function indexOfStateVariableRT(v, expr) {
        if (v && expr) {
            var pos = expr.indexOf(v);
            if (pos >= 0) {
                // check that we are not accidentally parsing a substring of a longer var name
                // if it's a genuine var name on the right-hand side of equalities/assignment,
                // the variable name is immediately preceeded by space or ( 
                // and immediately succeded by ) or arithmetic operators + * / -
                var before = expr.substr(0, pos).trim();
                var after  = expr.substr(pos + v.length + 1).trim();
                if ((before === "" || before.indexOf("(") === before.length - 1)
                        && (after.indexOf(")") === 0 || after.indexOf("+") === 0
                                || after.indexOf("-") === 0 || after.indexOf("*") === 0
                                || after.indexOf("/") === 0)) {
                    // it's a variable
                    return pos;
                }
            }
        }
        return -1;
    }

    /**
     * Utility function for printing PVS definitions of transition actions
     */
    function printAction(action, variables) {
        var tmp = "";
        // in this version of the tool we can identify state variables in
        // state updates, i.e., in actions given in the form v := expr, 
        // where v is a state variable
        if (variables) {
            variables.forEach(function (v) {
                var state_update = action.split(":=");
                if (state_update.length === 2) {
                    // check for the presence of state variables 
                    // on the right-hand side of the expression
                    var pos = indexOfStateVariableRT(v, state_update[1]);
                    if (pos >= 0) {
                        state_update[1] = state_update[1].replace(v, v + "(st)");
                    }
                    action = state_update[0].trim() + " := " + state_update[1].trim();
                }
            });
        }
        tmp += ",\n           new_st = new_st WITH [ " + action + " ]";
        return tmp;
    }
    
        
    /**
     * Utility function for identifying and grouping together cases that make up the body of a transition
     */
    function parseCases(transitions) {
        var transitionsSpec = d3.map();
        transitions.forEach(function (transition) {
            var t = parseTransition(transition);
            // extract transition signature
            var signature = t.name + "(" + "st: (per_" + t.name + ")): State";
            // collect cases that will make up the body of the transition
            var cases = transitionsSpec.has(signature) ?
                         transitionsSpec.get(signature)
                         : [];
            cases.push({
                cond: (t.cond === "") ? null : t.cond,
                actions: t.actions,
                from: t.from,
                to: t.to
            });
            transitionsSpec.set(signature, cases);
        });
        return transitionsSpec;
    }

    /**
     * Prints PVS definitions of utility functions used in Emuchart
     */
    function print_utils() {
        var ans = "  %-- utility functions";
        ans += "\n  enter_into(ms: MachineState)(st: State): State = st WITH [ current_state := ms ]";
        ans += "\n  leave_state(ms: MachineState)(st: State): State = st WITH [ previous_state := ms ]\n";
        return ans;
    }
    
    /**
     * Prints PVS definitions for Emuchart transitions given in the form transition [condition] {actions}
     */
    EmuchartsPVSPrinter.prototype.print_transitions = function (emuchart) {
        var transitions = emuchart.transitions;
        var variables = emuchart.variables;
        var ans = "";
        if (transitions && transitions.length > 0) {
            ans += print_utils();
            ans += "  %-- transition functions\n";
            var transitionsSpec = parseCases(transitions);
            // for each transition, print the transition body made out of the identifies cases
            transitionsSpec.forEach(function (signature) {
                // generate permission
                var tmp = "  per_" + signature.substr(0, signature.indexOf("(")) +
                            "(st: State): bool = true\n"
                // generate transition
                tmp += "  " + signature;
                var cases = transitionsSpec.get(signature);
                if (cases && cases.length > 0) {
                    tmp += " =\n   COND";
                    cases.forEach(function (cs) {
                        // check if the condition uses state variables
                        // -- if so, we need to add parameter (st)
                        if (variables) {
                            variables.forEach(function (v) {
                                // for each state variable, add suffix (st)
                                var pos = indexOfStateVariableLF(v, cs.cond);
                                if (pos >= 0) { cs.cond = cs.cond.replace(v, v + "(st)").trim(); }
                            });
                        }
                        tmp += "\n    current_state(st) = " + cs.from;
                        if (cs.cond) { tmp += " AND " + cs.cond; }
                        tmp += "\n    -> LET new_st = leave_state(" + cs.from + ")(st)";
                        cs.actions.forEach(function (action) {
                            tmp += printAction(action, variables);
                        });
                        tmp += "\n        IN enter_into(" + cs.to + ")(new_st),";
                    });
                    tmp = tmp.substr(0, tmp.length - 1) + "\n   ENDCOND";
                }
                ans += tmp + "\n\n";
            });
        }
        return ans;
    };

    /**
     * Prints PVS definitions for Emuchart variables
     */
    EmuchartsPVSPrinter.prototype.print_variables = function (emuchart) {
        var variables = emuchart.variables;
        var ans = "  %-- emuchart state\n  State: TYPE = [#\n" +
                    "   current_state : MachineState,\n" +
                    "   previous_state: MachineState";
        if (variables && variables.length > 0) {
            variables.forEach(function (name) {
                ans += ",\n   " + name + ": " + "real"//variables.get(name);
            });
        }
        ans += "\n  #]\n";
        return ans;
    };

    /**
     * Prints PVS definitions for Emuchart constants
     */
    EmuchartsPVSPrinter.prototype.print_constants = function (emuchart) {
        var constants = emuchart.constants;
        var ans = "";
        if (constants && constants.length > 0) {
            ans += "  %-- constants\n";
            constants.forEach(function (name) {
                ans += name + "\n";
            });
        }
        return ans;
    };

    /**
     * Prints PVS definitions for Emuchart constants
     */
    EmuchartsPVSPrinter.prototype.print_importings = function (emuchart) {
        var importings = emuchart.importings;
        var ans = "";
        if (importings && importings.length > 0) {
            ans += " IMPORTING ";
            importings.forEach(function (importing) {
                ans += importing + ", ";
            });
            ans = ans.substr(0, ans.length - 1) + "\n";
        }
        return ans;
    };
        
    EmuchartsPVSPrinter.prototype.print_descriptor = function (emuchart) {
        var ans = "% --------------------------------------------------------------" +
                    "\n%  Theory: " + emuchart.name +
                    "\n%  Generator: PVSio-web/Emulink ver1.0 (http://www.pvsioweb.org)";
        if (emuchart.author) {
            ans += "\n%  Author: " + emuchart.author.name +
                    "\n%          " + emuchart.author.affiliation +
                    "\n%          " + emuchart.author.contact;
        }
        if (emuchart.description) {
            ans += "\n% ---------------------------------------------------------------" +
                    "\n%  " + emuchart.description;
        }
        ans += "\n% ---------------------------------------------------------------\n";
        return ans;
    };
    
    /**
     * Prints the entire PVS theory
     */
    EmuchartsPVSPrinter.prototype.print = function (emuchart) {
        var ans = this.print_descriptor(emuchart) + "\n";
        ans += emuchart.name + ": THEORY\n BEGIN\n";
        ans += this.print_importings(emuchart);
        ans += this.print_constants(emuchart);
        ans += this.print_states(emuchart);
        ans += this.print_variables(emuchart);
        ans += this.print_transitions(emuchart);
        ans += " END " + emuchart.name + "\n";
        return ans;
    };
    
    module.exports = EmuchartsPVSPrinter;
});