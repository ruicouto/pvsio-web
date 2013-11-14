/**
 * Simple list viewer
 * @author Patrick Oladimeji <p.oladimeji@swansea.ac.uk>
 * @author Enrico D'Urso <e.durso7@gmail.com>
 * @date 9/19/13 10:30:29 AM
 */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, d3, require, $, brackets, window, MouseEvent */




/**
 * @fileOverview This file contains ListView module.It handles file list box (#listBox).
 *               In the comments,'file list box' is used in place of #listBox
 * @version 0.3
 */


/**
 * @module ListView
 *
 *
 */

define(function (require, exports, module) {
	"use strict";
	/**************   State Variables                                ***********************************************/

	var eventDispatcher = require("util/eventDispatcher");
	var property = require("util/property"),
		d3 = require("d3/d3"),
		/// Library to handle file
		handlerFile = require("../../../../lib/fileHandler/fileHandler");
	/// Form to open a new set of files
	var queue = require("d3/queue");
	var openFilesForm = require("pvsioweb/forms/openFiles");
	///    Used to change name of default files (i.e: default_name + counter )
	var counter = "";

	/**************  Exported Functions Definition                ************************************************/
	function renderSelectedItem(index, el, listItems) {
		listItems.classed("selected", false);
		el.classed("selected", true);
	}

	function updateSelectedItem(index, item, listView) {
		if (listView.selectedIndex() !== index) {
			var label = listView.labelFunction();
			renderSelectedItem(index, d3.select(listView._listItems[0][listView.selectedIndex()]), listView._listItems);
			var event = {
				type: "SelectedIndexChanged",
				selectedIndex: index,
				oldSelectedIndex: listView.selectedIndex(),
				selectedItem: item,
				selectedItemString: label(item)
			};
			listView.fire(event);
			listView.selectedIndex(index); //update selected index
			listView.selectedItem(item); //and selected item
		}
	}

	function ListView(elementId, data, labelFunction, classFunction) {
		eventDispatcher(this);
		this.selectedIndex = property.call(this, -1);
		this.selectedItem = property.call(this);
		//define simple css classing function if none was given
		this.classFunction = property.call(this, classFunction || function (d, i) {
			var odd_even = i % 2 === 0 ? "even" : "odd";
			return "listItem " + "listItem" + i + " " + odd_even;
		});
		//Select just files have to be shown
		var filesToShow = data.filter(function (d) {
			return d.toBeShown;
		});

		data = filesToShow;

		//define simple string based label function if none was given
		this.labelFunction = property.call(labelFunction || function (d) {
			return d.toString();
		});
		//create elements
		var listBox = d3.select(elementId).html("").append("ul");
		this._listBox = listBox;
		//Set an Id, this way I can get a reference (see function: showContentFileinEditor )
		listBox.attr("id", "listBox");

		var listItems = this._listBox.selectAll("li").data(data).enter()
			.append("li");
		this._listItems = listItems;
		listItems.append("span").attr("class", "list-icon list-icon-main");
		listItems.append("span").attr("class", "list-icon list-icon-dirty");
		listItems.append("span").attr("class", "file-label").html(labelFunction);

		//add listener for selection events
		listItems.on("click", function (d, i) {
			updateSelectedItem(i, d, this);
		});
		this.updateView();
	}

	ListView.prototype.selectItem = function (item) {
		var data = this._listItems.data();
		var index = data.indexOf(item);
		if (index > -1) {
			updateSelectedItem(index, data[index], this);
		}
	};

	ListView.prototype.updateView = function () {
		//update the class information on all list itmes
		this._listItems.attr("class", this.classFunction());
		if (this.selectedItem()) {
			renderSelectedItem(this.selectedIndex(),
				d3.select(this._listItems[0][this.selectedIndex()]), this._listItems);
		}
		return this;
	};

	module.exports = ListView;
	//
	//    module.exports = {
	//        ListView: ListView,
	//
	//        /** Display new file form to allow user to open a file, it makes use of 'open_file_form_aux'  */
	//        open_file_form: open_file_form,
	//
	//        /** Create a new file and add it in the project passed as parameter.The New file will be shown in file list box.  */
	//        new_file: new_file,
	//
	//        /** Prompt user to get a new name for the selected file                                                           */
	//        renameFileProject: renameFileProject,
	//
	//        renderSourceFileList: renderSourceFileList,
	//
	//        /** Remove user's selected file from file list box (not from the project itself )                          */
	//        closeFile: closeFile,
	//
	//        /** Shows in the Editor the content of the file passed as a parameter, if it is undefined mainPVSFile will be used,
	//                else last file of the project                                                  */
	//        showContentFileInEditor: showContentFileInEditor,
	//
	//        /** Delete a file from the project                                           */
	//        deleteFile: deleteFile,
	//
	//        /** Shows all files in the project in file list view                                   */
	//        showAllFiles: showAllFiles
	//
	//    };
});