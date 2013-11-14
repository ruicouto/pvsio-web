/**
 *
 * @author Patrick Oladimeji
 * @date 11/13/13 16:05:10 PM
 */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50, white: true */
/*global define, d3, require, $, brackets, window, MouseEvent */
define(function (require, exports, module) {
	"use strict";
	var ListView = require("prototypebuilder/ListView"),
		eventDispatcher = require("util/eventDispatcher"),
		property = require("util/property");

	function ProjectManager(project) {
		this.project = property.call(this, project);

	}


	function updateSourceCodeToolbarButtons(pvsFile, currentProject) {
		//update status of the set main file button based on the selected file
		if (pvsFile) {
			if (currentProject.mainPVSFile() && currentProject.mainPVSFile().name() === pvsFile.name()) {
				d3.select("#btnSetMainFile").attr("disabled", true);
			} else {
				d3.select("#btnSetMainFile").attr("disabled", null);
			}

			//update status of file save button based on the selected file
			if (pvsFile.dirty()) {
				d3.select("#btnSaveFile").attr("disabled", null);
			} else {
				d3.select("#btnSaveFile").attr("disabled", true);
			}
		}
	}


	function renderSourceFileList(files, currentProject, editor, ws) {

		var listLabelFunction = function (d) {
			return d.name();
		},
			classFunc = function (d) {
				var c = "fileListItem";
				if (d.dirty()) {
					c = c.concat(" dirty");
				}
				if (currentProject.mainPVSFile() && d.name() === currentProject.mainPVSFile().name()) {
					c = c.concat(" main-file");
				}
				return c;
			};
		var pvsFilesListBox = new ListView("#pvsFiles", files, listLabelFunction, classFunc);
		var pvsFile;

		function rebindEditorChangeEvent(pvsFile) {
			//update editor changed listener so that the project filecontent is updated when the editor is changed
			editor.on("change", function () {
				//ideally one should use information from ace to set the dirty mark on the document
				//e.g editor.getSession().getUndoManager().hasUndo();

				/// fileContent should not be updated if the file has been just closed (not visible)
				if (!pvsFile.toBeShown) {
					return;
				}

				pvsFile.content(editor.getValue()).dirty(true); //update the selected project file content
				updateSourceCodeToolbarButtons(pvsFile, currentProject);
				pvsFilesListBox.updateView();
			});
		}

		pvsFilesListBox.addListener("SelectedIndexChanged", function (event) {
			//fetch sourcecode for selected file and update editor
			pvsFile = event.selectedItem;
			if (pvsFile.content()) {
				editor.removeAllListeners("change");
				editor.setValue(pvsFile.content());
				editor.clearSelection();
				editor.moveCursorTo(0, 0);
				rebindEditorChangeEvent(pvsFile);
			} else {
				//fetch file contents from server and set the value
				var f = currentProject.path() + "/" + pvsFile.name();
				ws.getFile(f, function (err, res) {
					if (!err) {
						editor.removeAllListeners("change");
						pvsFile.content(res.fileContent).dirty(false);
						editor.setValue(pvsFile.content());
						editor.clearSelection();
						editor.moveCursorTo(0, 0);
						rebindEditorChangeEvent(pvsFile);
					} else {
						///TODO show error loading file
						console.log(JSON.stringify(err));
					}
				});
			}

			// User has clicked on a file, so we have to update updateLastClickedFile variable in Project
			currentProject.updateLastClickedFile(pvsFile);
			updateSourceCodeToolbarButtons(pvsFile, currentProject);
		});


	}


	/**
	 *  Prompt user to get a new name for the selected file
	 *
	 *  @param  currentProject            - reference to the project user is using
	 *  @param  editor                    - reference to editor
	 *  @param  ws                        - reference to webSocket
	 *
	 *  @returns void
	 *
	 */
	function renameFileProject(currentProject, editor, ws) {
		if (!currentProject.lastClickedFile) {
			console.log("User has not selected any file to rename ");
			return;
		}
		var newName = prompt("Type a new name", currentProject.lastClickedFile.name());
		currentProject.rename_file(newName);

		renderSourceFileList(currentProject.pvsFiles(), currentProject, editor, ws);

	}

	/**
	 *  Remove user's selected file from file list box (not from the project itself)
	 *
	 *  @param  currentProject            - reference to the project user is using
	 *  @param  editor                    - reference to editor
	 *  @param  ws                        - reference to webSocket
	 *
	 *  @returns void
	 *
	 */
	function closeFile(currentProject, editor, ws) {
		if (!currentProject.lastClickedFile) {
			console.log("User has not selected any file ");
			return;
		}
		currentProject.notShowFile();
		renderSourceFileList(currentProject.pvsFiles(), currentProject, editor, ws);

		///If user has clicked on a file, its content is shown in the editor, but editor should be empty at this time

		editor.setValue("");
		editor.clearSelection();
		editor.moveCursorTo(0, 0);

	}

	/**
	 *  Shows in the Editor the content of fileToShow, if it is undefined mainPVSFile will be used, else last file of the project
	 *
	 *  @param  currentProject           - reference to the current project
	 *  @param  editor                   - reference to the editor has to be used (actually, there is just an instance of editor (see main.js))
	 *  @param  [fileToShow]             - file which has to be shown in the editor (optional)
	 *
	 *  @returns void
	 *
	 */
	function showContentFileInEditor(currentProject, editor, ws, fileToShow) {

		/// Showing content of the mainPVSFile or  the last one on editor if mainPvsFile is not defined yet
		/// Note that the last file inserted is the most recently added

		var contentToShow = " ";
		var nameFileToShow = " ";

		if (!fileToShow) {
			if (!currentProject.mainPVSFile()) /// Checking if main file exists
			{
				var indexLastFileInserted = currentProject.pvsFiles().length - 1;
				if (indexLastFileInserted !== -1) {
					contentToShow = currentProject.pvsFiles()[indexLastFileInserted].content();
					nameFileToShow = currentProject.pvsFiles()[indexLastFileInserted].name();
					fileToShow = currentProject.pvsFiles()[indexLastFileInserted];
				}
			} else {
				contentToShow = currentProject.mainPVSFile().content();
				nameFileToShow = currentProject.mainPVSFile().name();
				fileToShow = currentProject.mainPVSFile();
			}
		} else {
			contentToShow = fileToShow.content();
			nameFileToShow = fileToShow.name();

		}

		if (!contentToShow) {
			var f = currentProject.path() + "/" + nameFileToShow;
			ws.getFile(f, function (err, res) {
				if (!err) {
					editor.removeAllListeners("change");
					fileToShow.content(res.fileContent).dirty(false);
					editor.setValue(fileToShow.content());
					editor.clearSelection();
					editor.moveCursorTo(0, 0);

				}
			});

		} else {
			editor.setValue(contentToShow);
			editor.clearSelection();
			editor.moveCursorTo(0, 0);
		}

		///Now, we need to highlight the file just opened (if opened) , in file list box,

		if (nameFileToShow === "") {
			return;
		}


		var listBox = d3.select("#listBox").selectAll("li"); ///Getting all element in the list
		listBox.classed("selected", false);

		var listItems = d3.select("#listBox").selectAll("li")[0];

		var length = listItems.length, i;

		/// Looking for the element just opened
		for (i = 0; i < length; i++) {
			if (listItems[i].__data__.name() == nameFileToShow) {
				d3.select(listItems[i]).classed("selected", true); /// Highlighting
			}
		}


	}

	/**
	 *  Delete a file from a project
	 *
	 *  @param  currentProject - reference to the project where file to delete is
	 *  @param  editor         - reference to editor
	 *  @param  ws             - reference to webSocket
	 *
	 *  @returns void
	 *
	 */
	function deleteFile(currentProject, editor, ws) {

		if (!currentProject.lastClickedFile) {
			console.log("user has not selected any file ");
			return;
		}
		currentProject.removeFile(currentProject.lastClickedFile);
		renderSourceFileList(currentProject.pvsFiles(), currentProject, editor, ws);
		showContentFileinEditor(currentProject, editor);
		handlerFile.deleteFileFs(currentProject.name() + "/" + currentProject.lastClickedFile.name(), ws);
	}

	/**
	 * Create a new file and add it in the project passed as parameter.The New file will be shown in file list box.
	 *
	 *  @param  currentProject            - project reference where file will be added
	 *  @param  editor                    - reference to editor
	 *  @param  ws                        - reference to webSocket
	 *  @param  {string} [name]           - name of the file. If undefined a default name will be used
	 *  @param  {string} [content]        - textual content of the file. If undefined a default content will be used
	 *
	 *  @returns void
	 *
	 */

	function new_file(currentProject, editor, ws, name, content) {
		var default_name = "MyTheory";
		var default_content = " THEORY BEGIN \nEND ";
		var init_content;

		if (!name) {
			init_content = default_name + counter;
			name = init_content + ".pvs";
			if (counter === "") {
				counter = 0;
			}
			counter = counter + 1;
		}

		if (!content) {
			content = init_content + default_content + init_content;
		}

		currentProject.addSpecFile(name, content);

		//FIXME: Maybe we needn't call renderSourceFileList each time
		renderSourceFileList(currentProject.pvsFiles(), currentProject, editor, ws);
	}




	/**
	 *  Shows all files in the project in file list view box
	 *
	 *  @param  currentProject - reference to the project whose files have to be showed
	 *  @param  editor         - reference to editor
	 *  @param  ws             - reference to webSocket

	 *  @returns void
	 *
	 */
	function showAllFiles(currentProject, editor, ws) {
		currentProject.setAllfilesVisible();
		renderSourceFileList(currentProject.pvsFiles(), currentProject, editor, ws);
	}


	/**************  Utility Functions private to the module    ************************************************/





	module.exports = ProjectManager;
//    module.exports = {
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