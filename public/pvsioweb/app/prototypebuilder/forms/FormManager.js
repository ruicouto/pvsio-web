/**
 *
 * @author Patrick Oladimeji
 * @date 11/13/13 16:58:22 PM
 */
/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, d3, require, $, brackets, window, MouseEvent */
define(function (require, exports, module) {
    "use strict";
    var queue = require("d3/queue"),
        handlerFile = require("lib/fileHandler/fileHandler");
    /**
     *  Open file specified in data, data must have this structure: ????  FIXME
     *
     *  @param  data ??? FIXME
     *  @param  currentProject -  reference to current project
     *  @param  editor         -  reference to editor
     *  @param  ws             -  reference to webSocket
     *
     *  @returns void
     *
     */
    function open_file_form_aux(data, currentProject, editor, ws) {
        var q = queue(),
            i;
        for (i = 0; i < data.pvsSpec.length; i++) {
            // To read file, we use handlerFile module defined in handlerFile.js
            q.defer(handlerFile.createFileLoadFunction(data.pvsSpec[i], currentProject));
        }

        q.awaitAll(function (err, res) {
            renderSourceFileList(currentProject.pvsFiles(), currentProject, editor, ws);
            showContentFileinEditor(currentProject, editor);
        });
    }

    /**
     *  Display new file form, if user selects a file, 'open_file_form_aux()' will be called
     *
     *  @param currentProject  -  reference to currentProject
     *  @param editor          -  reference to editor
     *  @param ws              -  reference to webSocket
     *
     *  @returns void
     *
     */
    function open_file_form(currentProject, editor, ws) {
        openFilesForm.create().on("cancel", function (e) {
            view.remove();
        }).on("ok", function (e, view) {
            open_file_form_aux(e.data, currentProject, editor, ws);
            view.remove();
        });
    }
    module.exports = {
    	/** Display new file form to allow user to open a file, it makes use of 'open_file_form_aux'  */
    	open_file_form: open_file_form
    };
});
