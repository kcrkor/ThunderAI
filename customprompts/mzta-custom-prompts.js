/*
 *  ThunderAI [https://micz.it/thunderdbird-addon-thunderai/]
 *  Copyright (C) 2024  Mic (m@micz.it)

 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.

 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.

 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { getPrompts } from "../js/mzta-prompts.js";

var somethingChanged = false;
var positionMax = 0;

document.addEventListener('DOMContentLoaded', async () => {
    let options = {
        valueNames: [ { data: ['idnum'] }, 'id', 'name', 'text', 'type', 'action', 'position', { name: 'need_selected', attr: 'checked_val'}, { name: 'need_signature', attr: 'checked_val'}, { name: 'need_custom_text', attr: 'checked_val'}, { name: 'is_default', attr: 'is_default_val'}, { name: 'enabled', attr: 'checked_val'} ],
        // item: `<tr>
        //     <td class="id"></td>
        //     <td class="name"></td>
        //     <td class="text"></td>
        //     <td class="properties">
        //         <input type="checkbox" class="need_selected"> Need Select
        //         <br>
        //         <input type="checkbox" class="need_signature"> Need Signature
        //         <br>
        //         <input type="checkbox" class="need_custom_text"> Need Custom Text
        //         <br>
        //         <span class="is_default">Is Default</span>
        //         <br>
        //         <input type="checkbox" class="enabled"> Enabled
        //     </td>
        // </tr>`
        item: function(values) {
            let output = `<tr ` + ((values.is_default == 1) ? 'class="is_default"':'') + `>
                <td class="id"></td>
                <td class="name"></td>
                <td class="text"></td>
                <td class="properties">
                    Type: ` + values.type + `
                    <br>
                    Action: ` + values.action + `
                    <br>
                    <input type="checkbox" class="need_selected"` + ((values.is_default == 1) ? 'disabled':'') + `> Need Select
                    <br>
                    <input type="checkbox" class="need_signature" ` + ((values.is_default == 1) ? 'disabled':'') + `> Need Signature
                    <br>
                    <input type="checkbox" class="need_custom_text"` + ((values.is_default == 1) ? 'disabled':'') + `> Need Custom Text
                    <br>
                    <input type="checkbox" class="enabled"> Enabled
                    <span class="is_default hiddendata">is_default</span>
                </td>
                <td>
                ` + ((values.is_default == 0) ? '<button class="btnEdit">Edit</button>':'') + `
               </td>
            </tr>`;
            //console.log('>>>>>>>> values.name: ' + JSON.stringify(values.name));
            positionMax = Math.max(positionMax, values.position);
            return output;
        }
    };

    //let values = getDefaultPrompts_withProps; // test in browser
    let values = await getPrompts();  // production

    console.log('>>>>>>>>>>>>>>>> values: ' + JSON.stringify(values));

    let promptsList = new List('all_prompts', options, values);

    checkSelectedBoxes();

    const btnSave = document.getElementById('btnSave');
    btnSave.disabled = true;
    btnSave.addEventListener('click', (e) => {
        e.preventDefault();
        saveAll();
    });

    const btnNew = document.getElementById('btnNew');
    btnNew.addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('formNew').style.display = 'block';
    });

    document.querySelectorAll('input').forEach(element => {
        element.addEventListener('change', (e) => {
            e.preventDefault();
            btnSave.disabled = false;
            somethingChanged = true;
        });
    })

    let btnEdit_elements = document.querySelectorAll(".btnEdit")
    if(btnEdit_elements) {
        btnEdit_elements.forEach(element => {
            element.addEventListener('click', (e) => {
                e.preventDefault();
                const tr = e.target.parentNode.parentNode;          //TODO
                console.log('>>>>>>>> tr: ' + tr.getAttribute('data-idnum'));
            });
        });
    }

    i18n.updateDocument();

    //To add a new item
    var txtIdNew = document.getElementById('txtIdNew');
    var txtNameNew = document.getElementById('txtNameNew');
    var txtTextNew = document.getElementById('txtTextNew');
    var selectTypeNew = document.getElementById('selectTypeNew');
    var selectActionNew = document.getElementById('selectActionNew');
    var selectNeedSelectedNew = document.getElementById('selectNeedSelectedNew');
    var selectNeedSignatureNew = document.getElementById('selectNeedSignatureNew');
    var selectNeedCustomTextNew = document.getElementById('selectNeedCustomTextNew');

    const btnAddNew = document.getElementById('btnAddNew');
    btnAddNew.addEventListener('click', (e) => {    //TODO
        e.preventDefault();
        //TODO check the id must be unique and without spaces
        promptsList.add({
            id: txtIdNew.value,
            name: txtNameNew.value,
            text: txtTextNew.value,
            type: selectTypeNew.value,
            action: selectActionNew.value,
            need_selected: selectNeedSelectedNew.value,
            need_signature: selectNeedSignatureNew.value,
            need_custom_text: selectNeedCustomTextNew.value,
            enabled: 1,
            position: positionMax + 1,
            is_default: 0,
        });
        //checkSelectedBoxes([selectTypeNew, selectActionNew, selectNeedSelectedNew, selectNeedSignatureNew, selectNeedCustomTextNew]);
        checkSelectedBoxes();
        clearFields();
    });


}, { once: true });
  

function clearFields() {
    document.getElementById('txtIdNew').value = '';
    document.getElementById('txtNameNew').value = '';
    document.getElementById('txtTextNew').value = '';
    document.getElementById('selectTypeNew').value = '0';
    document.getElementById('selectActionNew').value = '0';
    document.getElementById('selectNeedSelectedNew').value = '0';
    document.getElementById('selectNeedSignatureNew').value = '0';
    document.getElementById('selectNeedCustomTextNew').value = '0';
    document.getElementById('formNew').style.display = 'none';
}

function checkSelectedBoxes(checkboxes = null) {
    if(checkboxes == null){
        checkboxes = [
            ...document.querySelectorAll('.need_selected[type="checkbox"]'),
            ...document.querySelectorAll('.need_signature[type="checkbox"]'),
            ...document.querySelectorAll('.need_custom_text[type="checkbox"]'),
            ...document.querySelectorAll('.enabled[type="checkbox"]'),
        ];
    }

    // Iterate through the checkboxes
    checkboxes.forEach(checkbox => {
        // Check if the 'checked' attribute is "0"
        if (checkbox.getAttribute('checked_val') === "0") {
            // Uncheck the checkbox
            checkbox.checked = false;
        } else {
            checkbox.checked = true;
        }
    });
}

//Save all prompts
function saveAll() {
    //TODO
}

// window.addEventListener('beforeunload', function (event) {
//     // Check if any changes have been made
//     if (somethingChanged) {
//         event.preventDefault();
//     }
// });