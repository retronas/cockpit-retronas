//                            __________________________
//         .-:=[ RetroNAS_Cockpit_Package ]=:-.
//
// This file supports the Cockpit integration for RetroNAS
//
// Read the comments throughout this file for more information
//

// config files
const rn_menus = '/opt/retronas/config/menu';
const rn_menus_main = rn_menus + '/main.json';
const rn_vars = '/opt/retronas/ansible/retronas_vars.yml';

// assets
const rn_logo = 'assets/retronas-logo.png';
const rn_loading = 'assets/loading.gif';

// external scripts
const runner_ansible = '/opt/retronas/lib/ansible_runner.sh';
const runner_script = '/opt/retronas/lib/script_runner.sh';

// settings objects for global use
var rn_menu_data = new Object();
var rn_settings = new Object();

// exclude these tui menus, they aren't needed for web
const re = new RegExp('^(?!Exit|Services)');

// update log window
function _log(output) {
    document.getElementById("log-area").innerText = output;
}

// generic spawn wrapper
function exec_do(cmd_os, options={err:'out'}, dolog=true) {

    var commands = [];
    commands = cmd_os[1].split(":");

    var current = document.getElementById(cmd_os[ cmd_os.length - 1 ]);
    var loading = document.createElement('img');
    var parent = current.parentNode;
    loading.setAttribute('src',"assets/loading.gif");
    loading.classList = "rn-loading";
    parent.replaceChild(loading, current)

    commands.forEach(function(command) {
        console.log(command);
        cockpit.spawn(cmd_os, options).done(function(data) {
                returned = new String(data);
                //console.log(returned);
                if ( dolog ) { _log(returned); };
                parent.replaceChild(current, loading);
                alert("Successful");
                return(true);
            }).fail(function(error){
                returned = new String(error);
                //console.log(error);
                if ( dolog ) { _log(returned); };
                parent.replaceChild(current, loading);
                alert("Failed, please check log screen");
                return(false);
            }
        )
    }
    );
}

// privileged exection
function exec_su(cmd_os, dolog=true) {
    var result = exec_do(cmd_os, { 
            err: 'out', 
            superuser: 'require', 
        }, dolog);
    return result;
};

// non-privileged exection
function exec_n(cmd_os, dolog=true) {
    var result = exec_do(cmd_os, { 
        err: 'out', 
    }, dolog);
    return result;
};

// installers
function install_options() {

    var rn_cmd_request = "";
    var menu_item = this.id;
    // this is horrid
    var menu_name = this.parentNode.parentNode.parentNode.id.replace("ul-","");
    //console.log(rn_menu_data.dialog[menu_name]);
    rn_menu_data.dialog[menu_name].items.forEach(item=>{
        if ( menu_item === item.id ) {
            rn_cmd_request = item.command;
        }
    })

    var rn_cmd = runner_ansible;
    var cmd_os = [rn_cmd, rn_cmd_request, menu_item];
    var results = exec_su(cmd_os);

};

// elevated scripts out of static/
function run_script_su() {

    var rn_cmd_request = this.id;
    var rn_cmd = runner_script;
    var cmd_os = [rn_cmd, rn_cmd_request, rn_cmd_request];
    var results = exec_su(cmd_os);
};

// elevated scripts out of static/ with values from an input
function run_script_su_values() {

    var rn_cmd_request = this.id;
    var rn_value = document.getElementById(this.id +"-input").value
    var rn_cmd = runner_script;
    var cmd_os = [rn_cmd, rn_cmd_request, rn_value, rn_cmd_request];
    var results = exec_su(cmd_os, false );
};

// normal scripts run
function run_script() {

    var rn_cmd_request = this.id;
    var rn_cmd = runner_script;
    var cmd_os = [rn_cmd, rn_cmd_request, rn_cmd_request];
    var results = exec_n(cmd_os);
};

// normal script with values from an input
function run_script_values() {
    var rn_cmd_request = this.id;
    var rn_value = document.getElementById(this.id +"-input").value
    var rn_cmd = runner_script;
    var cmd_os = [rn_cmd, rn_cmd_request, rn_value, rn_cmd_request];
    var results = exec_n(cmd_os, false);
};

function hide_modal() {
    // this is ugly but meh
    const modals = Array.from(document.getElementsByClassName('rn-modal'));

    modals.forEach(modal=>{
        // hide em all first again
        modal.classList.replace("rn-show","rn-hidden")
    }) 
}

function open_modal() {
    hide_modal();
    // show what we clicked on
    //console.log(this.id);
    var key = document.getElementById(this.id+"-page");
    var item_modaldesc = document.getElementById(this.id+"-desc");
    var key_name = key.id.toLowerCase();
    var content = document.getElementById(this.id+"-content");
    var id = this.id.replace(/-(modal|dialog_input)/,'')
    var item = rn_menu_data.dialog[id];

    // lazy
    try {
        var item_ul = document.getElementById("ul-"+ key_name);
        item_ul.replaceChildren();
    }
    catch(err) {
        var item_ul = document.createElement('ul');
    }

    item_ul.id = "ul-"+ key_name;

    item_modaldesc.replaceChildren();
    item_modaldesc.innerHTML = item.description.replaceAll('|','<br />').replaceAll('\\','');
    content.appendChild(item_modaldesc);


    content.appendChild(item_ul);

    build_page_menu_items();

    key.classList.replace("rn-hidden","rn-show")

}

function close_modal() {
    hide_modal();
}

// build top menu based on json input
function build_top_level_menu() {
    menu_element = document.getElementById("retronas-menu");
    pages_element = document.getElementById("rn-pages-area")
    //main_menu_keys = Object.keys(rn_menus_main["main"]);

    rn_menu_data["menu"].items.forEach(main_menu=>{

        if ( main_menu.title.match(re) && main_menu.id !== "" ) {

            // build the menu entry
            // <li id="rn-config"   class="rn-menu-item rn-menu-hover pf-c-nav__item"><a href="#">Config</a></li>
            const menu_li = document.createElement('li');
            const menu_a = document.createElement('a');

            menu_a.href = "#"
            menu_a.innerText = main_menu.title;
            menu_li.classList = "rn-menu-item rn-menu-hover pf-c-nav__item";
            menu_li.id = "rn-"+main_menu.title.toLowerCase();
            menu_li.appendChild(menu_a);

            menu_element.appendChild(menu_li)

            // add the menu listener
            menu_li.addEventListener("click", show_page)

            // build the associate page element
            // <div id="rn-about-page" class="rn-page-container rn-about centerme rn-show">
            var page_div = document.createElement('div');
            page_div.id = "rn-"+main_menu.title.toLowerCase()+"-page";
            page_div.classList = "rn-page-container rn-about rn-wide-view rn-hidden";
            page_div.innerHTML = "<h1>"+main_menu.title+"</h1>";
            pages_element.appendChild(page_div);
        }

    })
}

function build_menus(menu="menu", type="page") {
    //var main_menu_keys = Object.keys(rn_menu_data.menu);

    rn_menu_data.menu.items.forEach(key=>{

        if ( key.title.match(re) && key.id !== "" ) {
            key_name = key.id.toLowerCase();
            if ( key_name !== 'exit' ) {

                page_name = "rn-"+key_name+'-'+type;
		console.log(page_name);

                var item_page = document.getElementById(page_name);
                const item_ul = document.createElement('ul');
                const item_modaldesc = document.createElement('div');
                item_ul.id = "ul-"+key_name;
                item_page.appendChild(item_modaldesc);
                item_page.appendChild(item_ul);

                item_modaldesc.id = key_name+"-desc"
                item_modaldesc.classList = "rn-modal-desc";
                item_modaldesc.replaceChildren();
                item_modaldesc.innerHTML = key.description.replaceAll('\n','<br />');

            }
        }

    });
    
}

function build_page_menu_items() {
  

    rn_menu_data["menu"].items.forEach(item=>{
    if ( item.id !== "" ) {

        item_prompt = item.prompt;
        if ( item_prompt === "" ) {
            item_prompt = "Install";
        }

        // build menu item
        //<li><div>EtherDFS<button id="etherdfs" class="rn-installer">Install</button></div></li>
        const item_button = document.createElement('button');
        const item_wdiv = document.createElement('div');
        const item_div = document.createElement('div');
        const item_title = document.createElement('div');
        const item_desc = document.createElement('div');
        const item_li = document.createElement('li');

        // somewhere here we want to handle grouping
        // <div class="group-header"><b>Netatalk</b></div>
        // need to build an object and store the relative data based on group membership

        // default button id
        item_button.id = item.id.toLowerCase();
        var superuser_required = false;

        // add the listener
        // types
        // |- install                /ansible         priv user ansible-playbook runner
        // |- script                 /scripts         user scripts
        // |- script-values          /scripts         user scripts that take input                                
        // |- script-static          /scripts/static  priv user scripts
        // |- script-static-values   /scripts/static  priv user scripts that take input
        // |- form                   -                open "id-menu" object
        // !- input:<type>           -                add an input of type to a page

        if ( item.type === "install" ) {
            item_button.addEventListener("click", install_options);
            superuser_required = true;
        } 
        else if (item.type === "script") {
            item_button.addEventListener("click", run_script);
        }
        else if (item.type === "script-values") {
            item_button.addEventListener("click", run_script_values);
        }
        else if (item.type === "script-static") {
            item_button.addEventListener("click", run_script_su); 
            item_button.id = "s-"+item.id.toLowerCase();
            superuser_required = true;
        }
        else if (item.type === "script-static-values") {
            item_button.addEventListener("click", run_script_su_values);
            item_button.id = "s-"+item.id.toLowerCase();
            superuser_required = true;
        }
        else if (item.type === "modal" || item.type === "dialog_input" ) {
            item_button.addEventListener("click", open_modal);
            item_button.id = item.id.toLowerCase()+"-"+item.type;

            // create the div to display as a modal

            const item_modalb = document.createElement('div');
            const item_modal = document.createElement('div');
            const item_modalc = document.createElement('div');
            const item_modals = document.createElement('span');
            const item_modaldesc = document.createElement('div');

            item_modals.classList = "rn-modal-close";
            item_modals.innerHTML = "&times;";
            item_modals.addEventListener("click", close_modal);

            item_modaldesc.id = item_button.id+"-desc"
            item_modaldesc.classList = "rn-modal-desc";

            item_modalb.id = item_button.id+"-page";
            item_modalb.classList = "rn-modal rn-hidden";

            item_modal.id = item_button.id+"-content";
            item_modal.classList = "rn-modal-content";
            item_modalc.innerHTML = "<h2>"+item.title+"</h2>";

            item_modal.appendChild(item_modals);
            item_modal.appendChild(item_modalc);
            item_modal.appendChild(item_modaldesc);
            item_modalb.appendChild(item_modal)

            document.body.appendChild(item_modalb);
        }

        // button config
        item_button.classList = 'rn-menu';
        item_button.innerText = item_prompt;                        

        if ( superuser_required ) {
            //item_li.classList = "rn-tile rn-sureq";
        }
        else {
            //item_li.classList = "rn-tile";
        }
        item_li.classList = "rn-tile";
        item_title.classList = "rn-tile-title";
        item_title.innerText = item.title;
        item_desc.classList = "rn-tile-description";
        item_desc.innerText = item.description;

        item_div.appendChild(item_title);
        item_div.appendChild(item_desc);

        item_wdiv.appendChild(item_button);
        item_wdiv.appendChild(item_div);

        item_li.appendChild(item_wdiv);

    	document.getElementById("ul-"+rn_menu_data["menu"].id.toLowerCase()).appendChild(item_li);

        //if (item.type === "modal") {
        //    build_menus(item.id, "modal-page");
        //}

    }
    });
}


// map basic yaml input to js
function yaml_to_js(yaml) {
    let rn_yaml = [];
    const lines = yaml.split("\n");
    lines.forEach(element => {
        if ( element.length > 0 ) {
            var replaced = element.replaceAll('"',"")
            var split = replaced.split(":");

            var key = split[0];
            // clean up the value
            var value = split[1].replace(/^\s+/g, '');

            rn_yaml[key] = value;
        }
    });

    return rn_yaml;
}


// read in the ansible config convert from ansible object to javascript object
// this is used
function read_ansible_cfg() {
    
    cockpit.file(rn_vars,
        { syntax: "YAML",
          binary: false,
          max_read_size: 256,
          superuser: 'true'
        }).read()
        .then((content, tag) => {
            rn_settings = yaml_to_js(content);
            update_input_from_cfg(rn_settings);
        })
        .catch(error => {
            //console.log(error);
            var msg = "Failed to read config file";
            alert(msg);
            _log(msg)
        });
}

// read in menu config
function read_menu_data(rn_menus_data) {

    cockpit.file(rn_menus_data,
        { syntax: JSON,
          binary: false,
          max_read_size: 150000,
          superuser: 'true'
        }).read()
        .then((content, tag) => {
            rn_menu_data = content;

	    if ( rn_menus_data.indexOf("main.json") > 0 ) {
            	build_top_level_menu();
	    } else {
            	build_page_menu_items();
            }
            build_menus();

        })
        .catch(error => {
            //console.log(error);
            var msg = "Failed to read config file";
            alert(msg);
            _log(msg)
        });
}


function update_input_from_cfg(rn_settings) {
    //document.getElementById('s-set-top-level-dir-input').value = rn_settings['retronas_path'];
    //document.getElementById('s-set-etherdfs-nic-input').value = rn_settings['retronas_etherdfs_interface'];
    //document.getElementById('s-set-top-level-dir-input').textContent = rn_settings['retronas_gog_os'];
}

// write a javascript object to ansible format
// this is handled in the called scripts for now
//function write_ansible_cfg() {}


// scan a path returning output to a listing of some kind
function scan_path() {

    var rn_cmd_request = this.id;
    this.disabled = true;
    var rn_cmd = '/opt/retronas/lib/format_path.sh';
    var cmd_os = [rn_cmd, rn_cmd_request];

    //console.log(cmd_os)
    var results = exec_n(cmd_os);
};

// page switcher, now you see it, now you don't
function show_page() {

    var menu_name = this.id.split("-")[1];
    var menu_file = rn_menus + '/' + menu_name + '.json'; 
    read_menu_data( menu_file );

    // this is ugly but meh
    const pages = Array.from(document.getElementsByClassName('rn-page-container'));

    pages.forEach(page=>{
        // hide em all first again
        page.classList.replace("rn-show","rn-hidden")
    })

    // show what we clicked on
    document.getElementById(this.id + "-page").classList.replace("rn-hidden","rn-show")

}

// waiting until we're loaded up so the elements we need are available
window.onload = function() {

    // group the elements we require to work with
    const menuitems = Array.from(document.getElementsByClassName('rn-menu-item'));

    // menu items (rn-menu-item)
    menuitems.forEach(menuitem=>{
        menuitem.addEventListener("click", show_page);
    })

    read_ansible_cfg();
    read_menu_data(rn_menus_main);

}

// nfi what this does, remove it and see what breaks at some point
// cockpit.transport.wait(function() { })
