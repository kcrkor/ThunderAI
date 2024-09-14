/*
 *  ThunderAI [https://micz.it/thunderbird-addon-thunderai/]
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

// Some original methods are derived from https://github.com/ali-raheem/Aify/blob/cfadf52f576b7be3720b5b73af7c8d3129c054da/plugin/html/actions.js

import { getPrompts } from './mzta-prompts.js';
import { getLanguageDisplayName, getMenuContextCompose, getMenuContextDisplay } from './mzta-utils.js'

export class mzta_Menus {

    allPrompts = [];
    openChatGPT = null;
    menu_context_compose = null;
    menu_context_display = null;
    menu_listeners = {};

    rootMenu = [
    //{ id: 'ItemC', act: (info, tab) => { console.log('ItemC', info, tab, info.menuItemId); alert('ItemC') } },
    ];

    constructor(openChatGPT) {
        this.menu_context_compose = getMenuContextCompose();
        this.menu_context_display = getMenuContextDisplay();
        this.openChatGPT = openChatGPT;
        this.allPrompts = [];
        this.listener = this.listener.bind(this);
    }


    async initialize() {
        this.allPrompts = [];
        this.rootMenu = [];
        this.menu_listeners = {};
        this.allPrompts = await getPrompts(true);   
        this.allPrompts.sort((a, b) => a.name.localeCompare(b.name));
        this.allPrompts.forEach((prompt) => {
            this.addAction(prompt)
        });
    }

    async reload(){
        await browser.menus.removeAll().catch(error => {
                console.error("[ThunderAI] ERROR removing the menus: ", error);
            });
        this.removeClickListener();
        this.loadMenus();
    }

    addAction = (curr_prompt) => {

        let curr_menu_entry = {id: curr_prompt.id, is_default: curr_prompt.is_default, name: curr_prompt.name};
    
        const getHighlight = async () => {
            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            return {tabId: tabs[0].id, 
                selection: await browser.tabs.sendMessage(tabs[0].id, { command: "getSelectedText" }),
                text: await browser.tabs.sendMessage(tabs[0].id, { command: "getTextOnly" })
            };
        };
    
        curr_menu_entry.act = async () => {
            const msg_text = await getHighlight();
    
            //check if a selection is needed
            if(String(curr_prompt.need_selected) == "1" && (msg_text.selection==='')){
                //A selection is needed, but nothing is selected!
                //alert(browser.i18n.getMessage('prompt_selection_needed'));
                const tabs = await browser.tabs.query({ active: true, currentWindow: true });
                browser.tabs.sendMessage(tabs[0].id, { command: "sendAlert", message : browser.i18n.getMessage('prompt_selection_needed') });
                return;
            }
    
            var body_text = '';
            if (msg_text.selection!=='') {
                body_text = msg_text.selection.replace(/\s+/g, ' ').trim();
            } else {
                body_text = msg_text.text.replace(/\s+/g, ' ').trim();
            }
            //open chatgpt window
            //console.log("Click menu item...");
            let chatgpt_lang = '';
            if(String(curr_prompt.define_response_lang) == "1"){
                let prefs = await browser.storage.sync.get({default_chatgpt_lang: ''});
                chatgpt_lang = prefs.default_chatgpt_lang;
                //console.log(" >>>>>>>>>>>> chatgpt_lang: " + chatgpt_lang);
                if(chatgpt_lang === ''){
                    chatgpt_lang = 'Reply in the same language.';
                }else{
                    chatgpt_lang = browser.i18n.getMessage("prompt_lang") + " " + chatgpt_lang + ".";
                }
            }
    
            var fullPrompt = curr_prompt.text + (String(curr_prompt.need_signature) == "1" ? " " + await this.getDefaultSignature():"") + " " + chatgpt_lang + " \"" + body_text + "\" ";
    
            switch(curr_prompt.id){
                case 'prompt_translate_this':
                    let prefs2 = await browser.storage.sync.get({default_chatgpt_lang: getLanguageDisplayName(browser.i18n.getUILanguage())});
                    let chatgpt_lang2 = prefs2.default_chatgpt_lang;
                    if(chatgpt_lang2 === ''){
                        chatgpt_lang2 = getLanguageDisplayName(browser.i18n.getUILanguage());
                    }
                    fullPrompt = curr_prompt.text + chatgpt_lang2 + ". \"" + body_text + "\" ";
                    break;
                case 'prompt_reply':
                    fullPrompt += "Do not add the subject line to the response."
                    break;
                default:
                    break;
            }

            const tabs = await browser.tabs.query({ active: true, currentWindow: true });
            // add custom text if needed
            //browser.runtime.sendMessage({command: "chatgpt_open", prompt: fullPrompt, action: curr_prompt.action, tabId: tabs[0].id});
            this.openChatGPT(fullPrompt, curr_prompt.action, tabs[0].id, curr_prompt.name, curr_prompt.need_custom_text);
        };
        this.rootMenu.push(curr_menu_entry);
    };

    async getDefaultSignature(){
        let prefs = await browser.storage.sync.get({default_sign_name: ''});
        if(prefs.default_sign_name===''){
            return '';
        }else{
            return "Sign the message as " + prefs.default_sign_name + ".";
        }
    }

    async loadMenus() {
        await this.initialize();
        await this.addMenu(this.rootMenu);
        this.addClickListener();
    }

    listener(info, tab) {
        let listeners = this.menu_listeners;
        if (listeners[info.menuItemId]) {
            listeners[info.menuItemId](info, tab);
        }
    }

    addClickListener() {
        browser.menus.onClicked.addListener(this.listener);
    }

    removeClickListener() {
        browser.menus.onClicked.removeListener(this.listener);
    }

    addMenu = async (menu, root = null) => {
        for (let item of menu) {
          let {id, is_default, name, menu, act} = item;

          await new Promise(resolve =>
            browser.menus.create({
                id: id,
                title: this.getCustomTextAttribute(id) + is_default == 1 ? (browser.i18n.getMessage(id) || name) : name,
                contexts: this.getContexts(id),
                parentId: root
              },
              resolve
            )
          );
      
          if (act) {
            this.menu_listeners[id] = act;
          }
      
          if (menu) {
            await this.addMenu(menu, id);
          }
        }
      
    };

    getContexts(id){
        //console.log(">>>>>>>>> id: " + id);
        const curr_prompt = this.allPrompts.find(p => p.id === id);
        //console.log(">>>>>>>>>> curr_prompt: " + JSON.stringify(curr_prompt));
        if (!curr_prompt) {
          return [];
        }
        switch(String(curr_prompt.type)){
            case "0":
                return [this.menu_context_compose, this.menu_context_display];
            case "1":
                return [this.menu_context_display];
            case "2":
                return [this.menu_context_compose];
            default:
                return [];
        }

    }

    getCustomTextAttribute(id){
        const curr_prompt = this.allPrompts.find(p => p.id === id);
        if (!curr_prompt) {
          return "";
        }
        if(String(curr_prompt.need_custom_text) === "1"){
            return "*";
        }else{
            return "";
        }
    }

}