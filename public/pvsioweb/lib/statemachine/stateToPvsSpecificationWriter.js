/**
 * @author Enrico D'Urso
 * @date 11/13/13 11:48:50 AM
 */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, d3, require, $, brackets, window, MouseEvent */



/**
 * @fileOverview Utility functions to translate from a graphic specification to a pvs specification.
 * @version 0.2
 */


/**
 * @module stateToPvsSpecificationWriter
 */


define(function (require, exports, module) {
	"use strict";

 
/**************     State Variables                              ************************************************/
	var writer;
    var hashTableContentEditor;
    var drawer;
    var currentProject;
    var ws;
    var editor;
    var pm;


/**************  Exported Functions Definition                    ************************************************/   
    
/** 
 *  This function has to be called at first, before calling any other functions in this module   
 *
 *  @param editor_           - Reference to the editor which will be used   
 *  @param wsocket           - Reference to webSocket
 *  @param curProj           - Reference to the current project 
 *  @param projManager       - Rerence to ProjectManager instance 
 *
 *  @returns void 
 *	      
 */
function init(editor_, wsocket, curProj, projManager)
{
    ws = wsocket;
    drawer = require("../../lib/statemachine/stateMachine");
    currentProject = curProj;
    editor = editor_;
    pm = projManager;  
    writer = new WriterOnContent(editor_);
    
}

/** 
 *  This set of functions allow to set tag format, if they are not called, default tags will be used    
 *
 *  @param tagStart          - Start tag string format 
 *  @param tagEnd            - End tag string format 
 *
 *  @returns void 
 *	      
 */
function setTagsName(tagStateNameStart, tagStateNameEnd) { writer.setTagsName(tagStateNameStart, tagStateNameEnd); }
function setTagsState(tagStateStart, tagStateEnd) { writer.setTagsState(tagStateStart, tagStateEnd); }
function setTagsFunc(tagFuncStart, tagFuncEnd) { writer.setTagsFunc(tagFuncStart, tagFuncEnd); }
function setTagsPer (tagPerStart,  tagPerEnd)  { writer.setTagsPer(tagPerStart, tagPerEnd); }
function setTagsEdge(tagEdgeStart, tagEdgeEnd) { writer.setTagsEdge(tagEdgeStart, tagEdgeEnd); }
function setTagsCond(tagCondStart, tagEdgeEnd) { writer.setTagsCond(tagCondStart, tagEdgeEnd); }
function setTagsField(tagFieldStart, tagFieldEnd) {writer.setTagsField(tagFieldStart, tagFieldEnd);  }

/** 
 *  Create a new pvs specification   
 *
 *  @param nameTheory           - Name of the pvs theory which will be created    
 *
 *  @returns void 
 *	      
 */
function newSpecification(nameTheory)
{       
        var fileHandlerEmulink = require("pvsioweb/../emulink/fileHandler/fileHandler");
        fileHandlerEmulink.new_file(currentProject, editor, ws, nameTheory, editor.getValue(), pm);
	    writer.createSkeletonSpecification(nameTheory);
        
}

/** 
 *  Add a state in the specification  
 *
 *  @param newState             - Object having name and id property  
 *
 *  @returns void 
 *	      
 */
function addState(newState)
{
        noFocus();
        writer.getLockOnEditor();
    
        var hasBeenStateAlreadyAdded = false;
        ///Get StateNames in String format: StateName: TYPE = {X0,X1...};
        var stateNamesString = writer.getStateNames();
        ///Building an array filled with the labels of the nodes: [X0,X1..]
        var stateNamesArray = stateNamesString.substring(stateNamesString.indexOf('{') + 1, stateNamesString.indexOf('}')).split(',');
    
        /// Check If newState.name is already in stateNames (checking is made only if stateNamesArray is defined ) 
        if( stateNamesArray){ hasBeenStateAlreadyAdded = itemIsContained(stateNamesArray, newState.name); }
    
        if( !hasBeenStateAlreadyAdded) { writer.addState(newState.name); }
        else { console.log("ERROR addState: Trying to add a state already added "); }

        writer.leaveLockOnEditor();
}
 
/** 
 *  Add field in PVS state  
 *
 *  @param {string} nameField   - Name of the new field
 *  @param {string} typeName    - Type of the new field
 *
 *  @returns void 
 *	      
 */
function addFieldInState(nameField, typeName)
{
    noFocus();
    writer.saveCursorPosition();
    writer.getLockOnEditor();
    
    writer.addFieldInState(nameField, typeName);
        
    writer.leaveLockOnEditor();
    writer.restoreCursorPosition();
}

/** 
 *  Add operation to do in a condition  
 *
 *  @param {string} nameTrans     - Name of the transition which contains the condition
 *  @param {string} sourceName    - Name of the source node in the condition
 *  @param {string} targetName    - Name of the target node in the condition
 *  @param {string} operation     - Operation  to be added 
 *  @returns void 
 *	      
 */  
function addOperationInCondition(nameTrans, sourceName, targetName, operation)
{
    noFocus();
    writer.getLockOnEditor();
    
    writer.addOperationInCondition(nameTrans, sourceName, targetName, operation);
        
    writer.leaveLockOnEditor();    
}

/** 
 *  Remove a state in the specification  
 *
 *  @param stateToRemove       - Object having name and id property  
 *
 *  @returns void 
 *	      
 */
function removeState(stateToRemove, nodeCounter)
{
    writer.getLockOnEditor();
    writer.removeState(stateToRemove.name, nodeCounter);
    writer.leaveLockOnEditor();
}

/** 
 *  Add a transition in the PVS Specification  
 *
 *  @param newTransition             - New transition function name  
 *
 *  @returns void 
 *	      
 */	
function addTransition(newTransition)
{
    writer.getLockOnEditor();
    
	writer.addTransition(newTransition );
	noFocus();  
    
    writer.leaveLockOnEditor();

}

/** 
 *  Add a condition for a transition function   
 *
 *  @param {string }   nameTransition    - Name of the transition has to be modified 
 *  @param source                        - source state for the condition is being added 
 *  @param target                        - target state for the condition is being added   
 *
 *  @returns void 
 *	      
 */
function addConditionInTransition(transitionName, source, target)
{
    writer.getLockOnEditor();
    
	writer.addConditionInTransition(transitionName, source.name, target.name);	
	//noFocus();
    
    writer.leaveLockOnEditor();
}

/** 
 *  This function should be called when user clicks on canvas,so the focus on previously selected element will be lost     
 *  @returns void 
 *	      
 */
function noFocus() { if(writer && writer.editor) { writer.editor.clearSelection(); } }

/** 
 *  Called when user clicks on an edge, the corresponding code in the editor will be highlighted    
 *  @param {object} edge  - Object which represents the edge, it should be at least 'name' property
 *  @param {bool} [clickedOn] - If true, user has just clicked on the edge
 *  @returns void 
 *	      
 */
function focusOnFun(edge, clickedOn)
{
     if( ! writer ) { return; }
    
     noFocus();

     var rangeFold = writer.editor.getSelectionRange();    
     var range = writer.editor.getSelectionRange();
     /***********************/
     
     var realNameEdge = edge.name.indexOf('{') == -1 ? edge.name : edge.name.substring(0, edge.name.indexOf('{'));
     var arrayTag = writer.buildTagCond(realNameEdge, edge.source.name, edge.target.name );    

	 // function find automatically highlights the text
     var searchOptions = { wholeWord: false, wrap: true, range: null, regExp: true };

	 var spaceRegex = "[\\s]*";
	 var separatorRegex = spaceRegex + "," + spaceRegex;

	 var blockStartNeedle = "%{\"_block\"" + spaceRegex + ":" + spaceRegex + "\"BlockStart\"";
	 var blockEndNeedle   = "%{\"_block\"" + spaceRegex + ":" + spaceRegex + "\"BlockEnd\"";
	 var idNeedle         = "\"_id\""    + spaceRegex + ":" + spaceRegex + "\"" + realNameEdge + "\"";
	 var sourceNeedle     = "\"_source\"" + spaceRegex + ":" + spaceRegex + "\"" + edge.source.name + "\"";
	 var targetNeedle     = "\"_target\"" + spaceRegex + ":" + spaceRegex + "\"" + edge.target.name + "\"";
	 var typeTransitionNeedle = "\"_type\""  + spaceRegex + ":" + spaceRegex + "\"Transition\"";


	 var needle1 =  blockStartNeedle + separatorRegex 
					+ idNeedle       + separatorRegex 
					+ sourceNeedle   + separatorRegex
					+ targetNeedle   + separatorRegex
					+ typeTransitionNeedle;

	 var needle2 =  blockEndNeedle   + separatorRegex 
					+ idNeedle       + separatorRegex 
					+ sourceNeedle   + separatorRegex
					+ targetNeedle   + separatorRegex
					+ typeTransitionNeedle;

     var initSearch = writer.editor.find(needle1, searchOptions);
     var endSearch = writer.editor.find(needle2, searchOptions);

     /// move the cursor to the first selected row, if a match has been found
	 if(initSearch) {
		 writer.editor.moveCursorTo(initSearch.start.row + 1, 0);
	 }
}

/** 
 *  This function should be called when user clicks on an element (node). Its purpose is to highlight the corresponding code in the editor
 *  @param {object} node  - Node to be highlighted in the editor, it is an object having at least 'name' property        
 *  @returns void 
 *	      
 */
function focusOn(node) {
    if(writer) {
		noFocus();
		var rangeNames = writer.getRangeStateNames();
		var searchOptions = { wholeWord: false, caseSensitive: true, range: rangeNames, regExp: true };
		var needle = node.name;
		writer.editor.find(needle, searchOptions)
	}
}

/** 
 *  This function is called when the user changes the name of a node, we need to change the PVS specification to be consistent with new name of node
 *  @param {string} oldName  - old name of the node  
 *  @param {string} newName  - new name of the node        
 *  @returns void 
 *	      
 */
function changeStateName(oldName, newName)
{
    writer.getLockOnEditor();
    
	var objectSearch = { wholeWord: true, caseSensitive : true, range: null }; 

	writer.editor.find(oldName, objectSearch);
	writer.editor.replaceAll(newName);
    
    writer.leaveLockOnEditor();
}
    
function addSwitchCond(nameTrans, sourceName, targetName, cond)
{
    writer.getLockOnEditor();
    
    writer.addSwitchCond(nameTrans, sourceName, targetName, cond);
    
    writer.leaveLockOnEditor();
}

/** 
 *  This function is called when the user changes the name of an edge, we need to change the PVS specification to be consistent with new name of    
    the edge
 *  @param {string} oldName      - old name of the edge 
 *  @param {string} newName      - new name of the edge
 *  @param {string} sourceName   - name of the source node of the transition 
 *  @param {string} deleteName   - name of the target node of the transition 
 *  @param {integer} counter     - number of the conditions inside the function (if one, we can delete it completely)
 *  @returns void 
 *	      
 */
function changeFunName(oldName, newName, sourceName, targetName, counter)
{
    // If counter > 1 there are other conditions in the trans. function so we cannot delete it
    // We just need to move the condition in a new trans. function 
    
    writer.getLockOnEditor();
    
    if( counter > 1 ) { writer.deleteCondInTrans(oldName, sourceName, targetName); } // Delete transition  
    else { writer.deleteTransition(oldName); } // Just delete condition
    
    writer.addTransition(newName ); // Create a new transition (if already present it will be not created)
    writer.addConditionInTransition(newName, sourceName, targetName); // Add condition 
        
    writer.leaveLockOnEditor();    
}

function undo() { writer.editor.undo(); }

function redo() { writer.editor.redo(); }


/**************  Utility Functions private to the module    ******************************************************/    
    
//Pure utility function used to check if item is an element of array
function itemIsContained(array, item)
{
    var length = array.length;

    for( var i = 0; i < length; i++ )
    {
         if( array[i] === item )
             return true;
    }
    return false;

}
    
function WriterOnContent( editor)
{   
    this.defaultStateName = "  StateName: TYPE";
	this.delimitator = ',' ;
	this.editor = editor;
    this.userIsModifying = 0;
    this.cursorPosition = 0;
	this.content = "";
    this.BLOCK_START = "%{\"_block\" : \"BlockStart\"";
    this.BLOCK_END   = "%{\"_block\" : \"BlockEnd\"";
    this.ID_FIELD    = "\"_id\"";
    
    /* List of tag string which will be used by default if user don't modify them */
    
    this.tagStateNameStart = "  " + this.BLOCK_START + ", " + this.ID_FIELD + " : \"StateName\", \"_type\": \"Nodes\"}";    
    this.tagStateNameEnd   = "  " + this.BLOCK_END   + ", " + this.ID_FIELD + " : \"StateName\", \"_type\": \"Nodes\"}";

    this.tagStateStart = "  " + this.BLOCK_START + ", " + this.ID_FIELD + " : \"State\", \"_type\": \"State\"}"; 
    this.tagStateEnd   = "  " + this.BLOCK_END   + ", " + this.ID_FIELD + " : \"State\", \"_type\": \"State\"}";

    this.tagFuncStart = "  " + this.BLOCK_START + ", " + this.ID_FIELD + " : \"*nameFunc*\", \"_type\": \"Function\"}";
    this.tagFuncEnd   = "  " + this.BLOCK_END   + ", " + this.ID_FIELD + " : \"*nameFunc*\", \"_type\": \"Function\"}";

    this.tagPerStart = "  " + this.BLOCK_START + ", " + this.ID_FIELD + " : \"*namePer*\", \"_type\": \"Permission\"}";
    this.tagPerEnd   = "  " + this.BLOCK_END   + ", " + this.ID_FIELD + " : \"*namePer*\", \"_type\": \"Permission\"}";

    this.tagEdgeStart = "  " + this.BLOCK_START + ", " + this.ID_FIELD + " : \"*nameEdge*\", \"_type\": \"Edge\"}";
    this.tagEdgeEnd   = "  " + this.BLOCK_END   + ", " + this.ID_FIELD + " : \"*nameEdge*\", \"_type\": \"Edge\"}";

    this.tagCondStart = "  " + this.BLOCK_START + ", " + this.ID_FIELD + " : \"*nameCond*\", \"_source\" : *SRC*, \"_target\" : *TRT*, \"_type\":"                                   +  "\"Transition\"}";    
    this.tagCondEnd   = "  " + this.BLOCK_END   + ", " + this.ID_FIELD + " : \"*nameCond*\", \"_source\" : *SRC*, \"_target\" : *TRT*, \"_type\":"
                        +  "\"Transition\"}";
    
    this.tagFieldStart = "  " + this.BLOCK_START + ", " + this.ID_FIELD + " : \"State\", \"_type\": \"State\"}";
    this.tagFieldEnd = "  " + this.BLOCK_END + ", " + this.ID_FIELD + " : \"State\", \"_type\": \"State\"}";

    this.tagSwitchCond = "{\"_cond\" : \"*COND*\"}";
    this.switchCondTag = "_switchCond";
    this.transActTag = "_transAct";

    /********* Functions about Editor changing (Note: I need to define them here ********/
    
    this.handleUserModificationOnEditor = function()
    {
        console.log("USER MODIFICATION"); 
		//// FIXME: this interferes with the autocompletion: the contextual menu created
		////          by the autocompletion functionality disappears when parseToFindInconsistency is invoked
        clearTimeout(writer.timeOut);
        writer.timeOut = setTimeout(function(){writer.parseToFindDiagramSpecificationInconsistency() } , 20000 );        
    }
    
    this.parseToFindDiagramSpecificationInconsistency = function()
    { 
        writer.saveCursorPosition();
        
        document.getElementById("warningDebug").value = "\tDEBUG: \n";
        var nodesInDiagram = drawer.getNodesInDiagram(); 
        var stateNamesInSpecification = writer.getStateNames();
        var edgesInDiagram = drawer.getEdgesInDiagram();
        
        /****************** Checking stateNames **************/

        writer.checkConsistenceStateNames(nodesInDiagram, stateNamesInSpecification);      
        
        /****************** Checking transFunctions **********/
        
        if( edgesInDiagram.length )
            writer.checkConsistenceTransFunction(edgesInDiagram);
        /******************************************************/
        
        editor.find(''); // This is an hack to make disappear selection created indirectly to find content
        
        writer.restoreCursorPosition();
    }

    this.checkConsistenceStateNames = function(nodesInDiagram, stateNamesInSpecification)
    {
        var debug = document.getElementById("warningDebug");
        var nodesInStateNames;
        var listEmpty = false;
        var numberOfStatesInDiagram;
        //First: Check if the list is empty
        if( stateNamesInSpecification.indexOf('=') == -1 )
            listEmpty = true;
        
        if( listEmpty && nodesInDiagram.length != 0 )
            alert("Error: stateNames");
        
        // Basically, we are getting just the name of the states and putting them in an array using split
        // Example: StateName: TYPE = {X0,X1};  ---> [X0, X1] 
        nodesInStateNames = stateNamesInSpecification.substring(
								stateNamesInSpecification.indexOf('{') + 1, 
								stateNamesInSpecification.indexOf('}') 
							).split(',');
        
        numberOfStatesInDiagram = nodesInDiagram.length;
        
        for( var i = 0; i < numberOfStatesInDiagram; i++ )
        { 
            var isContained = itemIsContained(nodesInStateNames, nodesInDiagram[i].name );  
            if( ! isContained ) 
            {   
                nodesInDiagram[i].warning.notPresentInSpec = true;
                debug.value = debug.value + "Error: " + nodesInDiagram[i].name + " is not contained in the specification\n";
            }
            else 
            {
                nodesInDiagram[i].warning.notPresentInSpec = false;   
            }
        }
        
        console.log("ConsistenceStateNames finished ");
        
    }
    this.buildIdealContentFromEdge = function(edge)
    {
        var source = edge.source.name;
        var target = edge.target.name;
        var listOfOper = edge.listOfOperations;
        var listOfCond = edge.listConditions;
        var stringToReturn = "st`current_state =" + source;

        if( listOfCond )
            listOfCond.forEach(function(cond){
                  stringToReturn = stringToReturn + "& st`" + cond;
            });

        stringToReturn = stringToReturn + "-> LET new_st = leave_state(" + source + ")(st)";

        if( listOfOper)
            listOfOper.forEach(function(oper){
                 stringToReturn = stringToReturn + ", new_st = new_st WITH [" + oper + "]";
            });

        stringToReturn = stringToReturn + "IN enter_into(" + target + ")(new_st)";

        return stringToReturn;
    }
    this.checkConsistenceTransFunction = function (edgesInDiagram)
    {
           var debug = document.getElementById("warningDebug");
          
           edgesInDiagram.forEach( function(currentEdge) {


                var idealContent = writer.buildIdealContentFromEdge( currentEdge);
                var realContent = writer.findRealTagCond(currentEdge.name, currentEdge.source.name, 
                                                         currentEdge.target.name);
                realContent = writer.getContentBetweenTags(realContent[0].replace(/(\r\n|\n|\r)/gm,""), 
                                                           realContent[1].replace(/(\r\n|\n|\r)/gm,""), false);

                /* To make comparison delete spaces \n and \t */;
                idealContent = idealContent.replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g,"");
                realContent = realContent.replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g,"");

                /* Delete last ',' if it is present */ 
                if( realContent.slice(-1) === ',')
                    realContent = realContent.substring(0, realContent.length -1);

                if( idealContent !== realContent)
                {
                    debug.value = debug.value + "\nInconsitence found in " + currentEdge.name;
                    console.log("\nInconsitence found in " + currentEdge.name);
                }
           });                 
        
    }
    this.createFuncTag = function(tagFunc, nameFunction) { return tagFunc.replace("*nameFunc*", nameFunction); }
    this.createPerTag = function(tagPer, namePer) { return tagPer.replace("*namePer*", namePer); }
    this.createCondTag = function(tagCond, nameCond, source, target) { return tagCond.replace("*nameCond*", nameCond).replace("*SRC*", "\""+source+"\"").replace("*TRT*","\""+target+"\""); }
    this.createEdgeTag = function(tagEdge, nameEdge) { return tagEdge.replace("*nameEdge*", nameEdge); }
    this.createSkeletonSpecification = function(nameTheory)
    {
        this.nameTheory = nameTheory.indexOf(".pvs") == -1 ? nameTheory : nameTheory.substring(0, nameTheory.indexOf(".pvs"));
        this.content = 
                   this.nameTheory + ": THEORY \n  BEGIN\n\n" +
		           this.tagStateNameStart + "\n" + 
	               "  StateName: TYPE\n" + 
		           this.tagStateNameEnd + "\n\n" + 
		           this.tagStateStart + "\n" + 
		           "  State: TYPE = [#\n" + 
                       "    current_state: StateName, \n" +
                       "    previous_state: StateName \n" +
                       "  #]\n" +
		           this.tagStateEnd + "\n\n" +
		           "  %{\"_block\" : \"BlockStart\", \"_id\" : \"initial_state\"}\n" +
	               "  initial_state: State \n" +
		           "  %{\"_block\" : \"BlockEnd\", \"_id\" : \"initial_state\"}\n\n" +
                   this.createFuncTag(this.tagFuncStart, "leave_state" ) + "\n" + 
                   "  leave_state(s: StateName)(st: State): State = st WITH [ previous_state := s ] \n" +
                   this.createFuncTag(this.tagFuncEnd, "leave_state" ) + "\n" + 
                   this.createFuncTag(this.tagFuncStart, "enter_into" ) + "\n" + 
                   "  enter_into(s: StateName)(st:State): State = st WITH [ current_state := s ] \n" +
                   this.createFuncTag(this.tagFuncEnd, "enter_into" ) +"\n\n" + 
                   " END " + this.nameTheory;   
        
        this.editor.setValue(this.content);
	    this.editor.clearSelection();
	    this.editor.moveCursorTo(0, 0);
    }
    this.checkConsistenceOperation = function(operation)
    {
        var indexEqual;
        
        if( (indexEqual = operation.indexOf('=')) == -1 )
            return;
        
        var missField = true;
        var fieldStateInOperation = operation.substring(0, indexEqual).replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g,"");
        var startTag = "%{\"_block\" : \"BlockStart\", \"_id\" : \"State\"}";
        var endTag = "%{\"_block\" : \"BlockEnd\", \"_id\" : \"State\"}";
        
        var currentFieldsState = this.getContentBetweenTags(startTag, endTag, false).replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g,"");
        currentFieldsState = currentFieldsState.substring(currentFieldsState.indexOf('#') + 1, currentFieldsState.lastIndexOf('#') );
        currentFieldsState = currentFieldsState.split(',');
        var length = currentFieldsState.length;
        
        for( var i = 0; i < length; i++ )
        {
             currentFieldsState[i] = currentFieldsState[i].substring(0, currentFieldsState[i].indexOf(':'));
             console.log(currentFieldsState[i],fieldStateInOperation);
             if( currentFieldsState[i] == fieldStateInOperation )
             {
                 missField = false;
                 break;
             }            
        }
        if( ! missField) { return; }
        
        var debug = document.getElementById("warningDebug");
        debug.value = "\t   DeBuG \n";
        debug.value = debug.value + "Warning: " + fieldStateInOperation + " is not in PVS State ";
    }
    
    this.changeEditor = function() 
    {          
        if( writer.userIsModifying ) { writer.handleUserModificationOnEditor(); }
        else { console.log("Writer has modified editor content"); }
    }
    
    this.editor.getSession().on('change', this.changeEditor );    
    this.userIsModifying = 1;

    this.getLockOnEditor    = function() { this.userIsModifying = 0; }
    this.leaveLockOnEditor  = function() { this.userIsModifying = 1; }
    this.saveCursorPosition = function() { this.cursorPosition = this.editor.getCursorPosition(); }
    this.restoreCursorPosition = function() { this.editor.moveCursorToPosition(this.cursorPosition); }

    this.getContentAndTags = function(startTag, endTag, isRegexp)
    {
        var range = editor.getSelectionRange();
		var objectSearch = { wrap: true, wholeWord: false, range: null, regExp: isRegexp }; 
        
		var initSearch = editor.find(startTag, objectSearch, true);
		var endSearch  = editor.find(endTag, objectSearch, true);

        if(initSearch && endSearch) {
			range.start.column = 0;
			range.end.column = 0;
			range.start.row = initSearch.start.row;
			range.end.row = endSearch.start.row + 1;
			return editor.session.getTextRange(range);
		}
		// else
		return "";
    }
    this.findRealTagCond = function(nameTrans, sourceName, targetName)
    {
        var arrayTag = this.buildTagCond(nameTrans, sourceName, targetName);
        var arrayTagToReturn = new Array();
        var range = editor.getSelectionRange();
        var objectSearch = { wrap: true, wholeWord: false, range: null }; 

        arrayTag.forEach(function( currentTag)
            {
                var tmp = currentTag.replace(/(\r\n|\n|\r)/g, "");
                tmp = currentTag.substring(0, currentTag.lastIndexOf('}'));
                tmp = writer.editor.find(tmp, objectSearch, false);
                range.start = tmp.start;
                range.end = tmp.end;
                range.end.column = 1000; //FIXME
                var realTag = writer.editor.session.getTextRange(range);
                arrayTagToReturn.push(realTag);

            });
        return arrayTagToReturn;

    }
    this.addSwitchCond = function(nameTrans, sourceName, targetName, cond)
    {
        var arrayTag = this.findRealTagCond(nameTrans, sourceName, targetName);
        var arrayTagCopy = arrayTag;

        arrayTag[0] = arrayTag[0].replace(/(\r\n|\n|\r)/gm, "");
        arrayTag[1] = arrayTag[1].replace(/(\r\n|\n|\r)/gm, "");
        var content = this.getContentBetweenTags(arrayTag[0], arrayTag[1], false);
        
        if( content == "" )
        {
            console.log("Error in addSwitchCond, content is empty");
            return;
        }
        
        var newContent = content.substring(0, content.indexOf("->")) + "  & " + "st`" + cond + "\n    " + 
            content.substring(content.indexOf("->") -2) ;
        
        this.editor.find(content );
        this.editor.replace( newContent );     

        this.addSwitchCondInTag(arrayTagCopy, cond); 
        
    }
    this.addSwitchCondInTag = function(arrayTag, cond)
    {  
        arrayTag.forEach(function( currentTag )
        {
            var currentTagJson = currentTag.substring(currentTag.indexOf('{'));
            var actualObject;
            var newTag;
            var tmpObject = {};          
            var alreadyExist = false;
            try {
                actualObject = JSON.parse(currentTagJson); //Getting Object
                var switchCond = actualObject[writer.switchCondTag]; //Getting conditions field
                if( ! switchCond ) //If does not exist, create this field
                    switchCond = new Array();
                else
                {   
                    alreadyExist = true;
                }
                switchCond.push(cond); //Insert condition
                tmpObject[writer.switchCondTag] = switchCond; 
                newTag = JSON.stringify(tmpObject); //We cannot stringify actualObject to preserve spaces 

            }
            catch( err)
            {
                console.log("Error in addSwitchCond \n" + err);
                alert("Error in addSwitchCond \n" + err);
                return;
            }
            newTag = newTag.replace('{', "").replace('}', ""); //Stringify add brackets we do not need them

            if( alreadyExist === false ) //If there was no cond. field add it at the end 
            {   
                newTag = currentTag.substring(0, currentTag.lastIndexOf('}')) + ", " + newTag + '}';
            }
            else
            {   var oldCondField = currentTag.substring(currentTag.indexOf(writer.switchCondTag));
                oldCondField = oldCondField.substring(0, oldCondField.indexOf(']') + 1);
                newTag = newTag.replace("\"", ""); //delete initial " created by stringify
                newTag = currentTag.replace(oldCondField, newTag);
            }

            writer.editor.find(currentTag);
            writer.editor.replace(newTag);     

        }); //End Loop
    }
    this.getContentBetweenTags = function(startTag, endTag, isRegexp)
    {
        var range = editor.getSelectionRange();
		var objectSearch = { wrap: true, wholeWord: false, range: null, regExp: isRegexp }; 
        
		var initSearch = editor.find(startTag, objectSearch, true);
		var endSearch  = editor.find(endTag, objectSearch, true);

        if(initSearch && endSearch) {
			range.start.column = 0;
			range.end.column = 0;
			range.start.row = initSearch.start.row +1 ;
			range.end.row = endSearch.start.row;		
			return editor.session.getTextRange(range);
		}
		// else
		return "";
    }
    this.setTagsName = function(tagStateNameStart, tagStateNameEnd)
    {
        this.tagStateNameStart = tagStateNameStart;
        this.tagStateNameEnd = tagStateNameEnd;
    }
    this.setTagsField = function(tagFieldStart, tagFieldEnd)
    {   
        this.tagFieldStart = tagFieldStart;
        this.tagFieldEnd = tagFieldEnd;
    }
    this.setTagsState = function(tagStateStart, tagStateEnd)
    {
        this.tagStateStart = tagStateStart;
        this.tagStateEnd = tagStateEnd;
    }
    this.setTagsFunc = function(tagFuncStart, tagFuncEnd)
    {
        this.tagFuncStart = tagFuncStart;
        this.tagFuncEnd = tagFuncEnd;
    }
    this.setTagsPer = function(tagPerStart, tagPerEnd)
    {
        this.tagPerStart = tagPerStart;
        this.tagPerEnd = tagPerEnd;
    }
    this.setTagsEdge = function(tagEdgeStart, tagEdgeEnd)
    {
        this.tagEdgeStart = tagEdgeStart;
        this.tagEdgeEnd = tagEdgeEnd;
    }
    this.setTagsCond = function (tagCondStart, tagCondEnd)
    {
        this.tagCondStart = tagCondStart;
        this.tagCondEnd = tagCondEnd;
    }
    this.addOperationInCondition = function(nameTrans, sourceName, targetName, operation)
    {
        this.checkConsistenceOperation(operation);
        var rawOperation = operation;
        operation = "  new_st = new_st WITH [ " + operation + " ]";
        var arrayTag = this.findRealTagCond(nameTrans, sourceName, targetName);
        var arrayTagCopy = arrayTag;
        arrayTag[0] = arrayTag[0].replace(/(\r\n|\n|\r)/gm, "");
        arrayTag[1] = arrayTag[1].replace(/(\r\n|\n|\r)/gm, "");
        var content = this.getContentBetweenTags(arrayTag[0], arrayTag[1], false);
        
        if( content == "" )
        {
            console.log("Error in addOperationInCondition, content is empty");
            return;
        }
        
        var newContent = content.substring(0, content.indexOf("IN")) + "," + operation + "\n    " + content.substring(content.indexOf("IN") -2) ;
        
        this.editor.find(content );
        this.editor.replace( newContent );    
        this.addOperationInTagCond(arrayTagCopy, rawOperation);    
    }
    this.addOperationInTagCond = function(arrayTag, operation)
    {
        arrayTag.forEach(function( currentTag )
        {
            var currentTagJson = currentTag.substring(currentTag.indexOf('{'));
            var actualObject;
            var newTag;
            var tmpObject = {};          
            var alreadyExist = false;
            try {
                actualObject = JSON.parse(currentTagJson); //Getting Object
                var transActTag = actualObject[writer.transActTag]; //Getting conditions field
                if( ! transActTag) //If does not exist, create this field
                    transActTag = new Array();
                else
                {   
                    alreadyExist = true;
                }
                transActTag.push(operation); //Insert condition
                tmpObject[writer.transActTag] = transActTag; 
                newTag = JSON.stringify(tmpObject); //We cannot stringify actualObject to preserve spaces 

            }
            catch( err)
            {
                console.log("Error in addOperationInTagCond  \n" + err);
                alert("Error in addOperationInTagCond  \n" + err);
                return;
            }
            newTag = newTag.replace('{', "").replace('}', ""); //Stringify add brackets we do not need them

            if( alreadyExist === false ) //If there was no cond. field add it at the end 
            {   
                newTag = currentTag.substring(0, currentTag.lastIndexOf('}')) + ", " + newTag + '}';
            }
            else
            {   var oldTransOperField = currentTag.substring(currentTag.indexOf(writer.transActTag));
                oldTransOperField = oldTransOperField.substring(0, oldTransOperField.indexOf(']') + 1);
                newTag = newTag.replace("\"", ""); //delete initial " created by stringify
                newTag = currentTag.replace(oldTransOperField, newTag);
            }

            writer.editor.find(currentTag);
            writer.editor.replace(newTag);     

        }); //End Loop
    }
    this.addFieldInState = function(nameField, typeName)
    {
        var startTag = this.tagFieldStart;
        var endTag = this.tagFieldEnd;
        
        var oldContent = this.getContentBetweenTags(startTag, endTag, false);
        
        //Checking error in getting content
        if( oldContent == "" )
        {
            console.log("Error in addFieldInState, content is empty");
            return;
        }
        
        /// Getting just name and type 
        var content = oldContent.substring(oldContent.indexOf('#') + 1, oldContent.lastIndexOf('#') );
        
        var arrayFields = content.split(',');
        /// Inserting new values
        arrayFields.push(nameField + ': ' + typeName);
        
        var newContent ="  State: TYPE = [#\n";
        var length = arrayFields.length ;
        for( var i = 0; i < length ; i ++)
        {
             var comma = (i == (length - 1 )) ? "\n" : ",\n" ;
             newContent = newContent + "     "  +  arrayFields[i].replace(/(\r\n|\n|\r)/gm,"").replace(/\s+/g,"")  +  comma ;
        }   
        newContent = newContent + "  #]\n";
        
        this.editor.find(oldContent);
        this.editor.replace(newContent);
        this.editor.find('');
    }
	this.addState = function(newState)
	{          
		var range = editor.getSelectionRange();
		var objectSearch = { wholeWord: false, range: null }; 

		var init = this.tagStateNameStart;
		var end = this.tagStateNameEnd;

		var initSearch = editor.find(init, objectSearch, true);
		var endSearch  = editor.find(end, objectSearch, true);

		range.start.column = 0;
		range.end.column = 0;
		range.start.row = initSearch.end.row + 1;
		range.end.row = (endSearch.end.row - 1 > range.start.row)? endSearch.end.row - 1 : range.start.row;
		
		//Content should be the list of the states
		var content = editor.session.getLines(range.start.row, range.end.row).join("");

        var symbol_beg = "";
		var newStateString;

		///Checking if a state has been already added 
		var index = content.indexOf('}');
		if( index == -1 ) ///If not, add also the '{' at the beginning 
		{
		    symbol_beg = " = {";
		    index = content.indexOf('E') + 1;
            this.delimitator = "";
	    }
		
		newStateString = content.substring(0, index);
		newStateString = newStateString + symbol_beg + this.delimitator + newState + '};';
		this.delimitator = ',';
		
		editor.find(content);
		editor.replace(newStateString);
        
        var tmp = new Object();
        tmp.name = newState;
        focusOn(tmp);
	} 
        
    this.removeState = function(stateToRemove, stateCounter )
    {        
            //First we need to remove state from StateNames                 
            var content = this.getStateNames();
            var newContent;
            
            //Processing situation  in which there are no states 
            editor.find(content);
            if( stateCounter === 0 )
            {
                editor.replace(this.defaultStateName);
                return;    
            }
            newContent = content.replace(stateToRemove, " ");
            newContent = newContent.replace(" ,", "").replace(", ,","").replace(", ","");
            editor.replace(newContent);    
            //FIXME: ADD delete Node in function
    }
	
	this.addTransition = function (newTransition)
	{        
		var range = editor.getSelectionRange();
        
        var objectSearch = { wholeWord: true, wrap: true, range: null }; 
        
		//Before adding a Transition, we need to check if it has been already created	
		var spaceRegex = "[\\s]*";
		var separatorRegex = spaceRegex + "," + spaceRegex;
		var blockStartNeedle = "%{\"_block\"" + spaceRegex + ":" + spaceRegex + "\"BlockStart\"";
		var blockEndNeedle   = "%{\"_block\"" + spaceRegex + ":" + spaceRegex + "\"BlockEnd\"";
		var idNeedle         = "\"_id\""    + spaceRegex + ":" + spaceRegex + "\"" + newTransition + "\"";
		var typeEdgeNeedle   = "\"_type\""  + spaceRegex + ":" + spaceRegex + "\"Edge\"";

        var firstTag  = blockStartNeedle + separatorRegex + idNeedle + separatorRegex + typeEdgeNeedle;
        var secondTag = blockEndNeedle + separatorRegex + idNeedle + separatorRegex + typeEdgeNeedle;

		var ans = this.getContentBetweenTags(firstTag, secondTag, true);

		// If initial Tag is present, transition has been already created -- nothing to do
		if( ans ) { return; }

		//Transition function has not been already created
		var end = "END";

		var endSearch = editor.find(end, objectSearch, true);
		var content;	
	
		range.start.column = 0;
		range.end.column= 11111; ///FIXME
		range.start.row = endSearch.end.row - 1;
		range.end.row = endSearch.end.row - 1;
 
		editor.gotoLine(endSearch.end.row , 1000, true);
        
		content = this.createPerTag(this.tagPerStart, newTransition) + 
		          "\n" +  "  per_" + newTransition + "(st: State) : bool = true\n" +
                  this.createPerTag(this.tagPerEnd, newTransition)   + "\n\n";  
	
		content = content + this.createEdgeTag(this.tagEdgeStart, newTransition) + 
			  "\n" +
			  "  " + newTransition + "(st: (per_" + newTransition + ")): State = \n" +
			  "  COND\n" +
			  "  ENDCOND\n" +
			  this.createEdgeTag(this.tagEdgeEnd, newTransition) +  "\n"; 			  
			
		editor.insert("\n" + content + "\n");
	}
	this.buildTagCond = function(nameTransition, sourceName, targetName)
    {
           var tagCondArray = new Array();
        
           tagCondArray.push("\n" + this.createCondTag(this.tagCondStart, nameTransition, sourceName, targetName) + "\n" );        
           tagCondArray.push("\n" + this.createCondTag(this.tagCondEnd, nameTransition, sourceName, targetName) + "\n" );
        
           return tagCondArray;         
    }
	this.addConditionInTransition = function(transitionName, sourceName, targetName )
	{        
	    var condTag = this.buildTagCond(transitionName, sourceName, targetName);

		var spaceRegex = "[\\s]*";
		var separatorRegex = spaceRegex + "," + spaceRegex;
		var blockStartNeedle = "%{\"_block\"" + spaceRegex + ":" + spaceRegex + "\"BlockStart\"";
		var blockEndNeedle   = "%{\"_block\"" + spaceRegex + ":" + spaceRegex + "\"BlockEnd\"";
		var idNeedle         = "\"_id\""    + spaceRegex + ":" + spaceRegex + "\"" + transitionName + "\"";
		var typeEdgeNeedle       = "\"_type\""  + spaceRegex + ":" + spaceRegex + "\"Edge\"";

        var firstTag  = blockStartNeedle + separatorRegex + idNeedle + separatorRegex + typeEdgeNeedle;
        var secondTag = blockEndNeedle + separatorRegex + idNeedle + separatorRegex + typeEdgeNeedle;
        
		var ans = this.getContentBetweenTags(firstTag, secondTag, true);
        var comma = (ans.indexOf('%') == -1)? '' : ',';
        
		var searchOptions = { wholeWord: false, range: null, regExp: false }; 
		var endSearch = editor.find(ans, searchOptions);

		// FIXME: need to improve the code here!
		editor.gotoLine(endSearch.start.row +2  , 1000, true);        
        editor.insert(condTag[0]);
		editor.insert("     st`current_state = "  + sourceName + "\n    -> LET new_st = leave_state("+sourceName +")(st)" +
                              "\n        IN enter_into("+ targetName + ")(new_st)" + comma);
        editor.insert(condTag[1]);
        
        var edge = new Object();
        edge.source = new Object();
        edge.target = new Object();
        edge.source.name = sourceName;
        edge.target.name = targetName;
        edge.name = transitionName;
        
		focusOnFun(edge);
	}

    this.buildTagFunction = function(transName)
    {
        var arrayTagFunc = new Array();
        
        arrayTagFunc.push(this.createEdgeTag(this.tagEdgeStart, transName));
        arrayTagFunc.push(this.createEdgeTag(this.tagEdgeEnd, transName));
        
        return arrayTagFunc;           
    }
    this.buildTagPerFunction = function(transName)
    {
        var arrayTagPerFun = new Array();
        
        arrayTagPerFun.push(this.createPerTag(this.tagPerStart, transName));
        arrayTagPerFun.push(this.createPerTag(this.tagPerEnd, transName));
        
        return arrayTagPerFun;
    }
    this.deleteContent = function(contentToDelete)
    {
		//FIXME: ace has a function to delete the content of a selection -- let's use it!
        if( typeof contentToDelete === 'string' ) 
            contentToDelete = [ contentToDelete ];
        
        var contentEditor = this.editor.getValue();
        
        for( var i = 0; i < contentToDelete.length; i++)
        {
             contentEditor = contentEditor.replace(contentToDelete[i], '');    
        }
        
        contentEditor = contentEditor.replace(/^\s*$[\n\r]{2,}/gm, '');
        
        this.editor.setValue(contentEditor);    
    }
    this.deleteCondInTrans = function(transName, sourceName, targetName)
    { 
//       var tagCond = this.buildTagCond(transName, sourceName, targetName);
//       var content = this.getContentBetweenTags(tagCond[0], tagCond[1], false);

		var spaceRegex = "[\\s]*";
		var separatorRegex = spaceRegex + "," + spaceRegex;
		var blockStartNeedle = "%{\"_block\"" + spaceRegex + ":" + spaceRegex + "\"BlockStart\"";
		var blockEndNeedle   = "%{\"_block\"" + spaceRegex + ":" + spaceRegex + "\"BlockEnd\"";
		var idNeedle         = "\"_id\""    + spaceRegex + ":" + spaceRegex + "\"" + transName + "\"";
		var sourceNeedle     = "\"_source\"" + spaceRegex + ":" + spaceRegex + "\"" + sourceName + "\"";
		var targetNeedle     = "\"_target\"" + spaceRegex + ":" + spaceRegex + "\"" + targetName + "\"";
		var typeTransitionNeedle = "\"_type\""  + spaceRegex + ":" + spaceRegex + "\"Transition\"";

        var firstTag  = blockStartNeedle + separatorRegex + idNeedle + separatorRegex 
						+ sourceNeedle + separatorRegex + targetNeedle + separatorRegex + typeTransitionNeedle;
        var secondTag = blockEndNeedle + separatorRegex + idNeedle + separatorRegex
						+ sourceNeedle + separatorRegex + targetNeedle + separatorRegex + typeTransitionNeedle;

		var ans = this.getContentAndTags(firstTag, secondTag, true);
    
		this.deleteContent(ans);
    }
    this.deleteTransition = function(nameFun) 
    {        
        var tagFun = this.buildTagFunction(nameFun);
        var tagPerFun = this.buildTagPerFunction(nameFun);
        var contentFun;
        
        var contentPer = this.getContentBetweenTags(tagPerFun[0], tagPerFun[1], false);
        
        if( contentPer == "" )
        {
            console.log("Error in deleteTransition, contentPer is empty");
            return;
        }

        this.deleteContent(tagPerFun[0]);
        this.deleteContent(contentPer);
        this.deleteContent(tagPerFun[1]);
        
        contentFun = this.getContentBetweenTags(tagFun[0], tagFun[1], false);  
        
        if( contentFun == "" )
        {
            console.log("Error in addOperationInCondition, contentFun is empty");
            return;
        }

        this.deleteContent(tagFun[0]);
        this.deleteContent(contentFun);
        this.deleteContent(tagFun[1]);      
        
    }
    this.getRangeStateNames = function()
    {
        var range = editor.getSelectionRange();
		var objectSearch = { 
                             wrap: true,
  				             wholeWord: false,
				             range: null
			               }; 

        var init = this.tagStateNameStart;
		var end  = this.tagStateNameEnd;

		var initSearch = editor.find(init, objectSearch, true);
		var endSearch = editor.find(end, objectSearch, true);
		var content;	

		range.start.column = 0;
		range.end.column= 11111; ///FIXME
		range.start.row = initSearch.end.row + 1;
		range.end.row = endSearch.end.row - 1;
        
        return range;
        
    }
    this.getStateNames = function()
    {
        var listStatesNames = this.getContentBetweenTags(this.tagStateNameStart, this.tagStateNameEnd);        
        return listStatesNames;    
    }
}

    
/*************    Exported Function               ************************************************/

module.exports = {
        newSpecification : newSpecification,
        addState : addState,
        removeState : removeState,
		addTransition : addTransition,
        addSwitchCond : addSwitchCond,
		addConditionInTransition : addConditionInTransition,
		noFocus : noFocus,
		focusOn : focusOn,
		focusOnFun : focusOnFun,
		changeStateName : changeStateName,
        changeFunName : changeFunName, 
        undo : undo,
        redo : redo,
        click : noFocus,
        addFieldInState : addFieldInState,
        addOperationInCondition: addOperationInCondition,
        setTagsName : setTagsName,
        setTagsState : setTagsState,
        setTagsFunc : setTagsFunc,
        setTagsPer : setTagsPer,
        setTagsCond : setTagsCond,
        setTagsEdge : setTagsEdge,
        init : init,
        setTagsField : setTagsField

};




});
