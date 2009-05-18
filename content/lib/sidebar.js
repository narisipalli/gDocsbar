Components.utils.import("resource://gre/modules/JSON.jsm");

gbar = GDOCSBARUtils.extend({
    init: function(){
        (function(){
            $ = this.$;
            gbarc = Components.classes["@gdocsbar.com/gdocsbar;1"].getService(Components.interfaces.nsIGdocsBar);
            nsIObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
            le_holder = this.$("le_holder");
            page_list = this.$("gDocsList");
            page_login = this.$("gDocsBarLogin");
            gDocsList_list = this.$("gDocsList_list");
            gDocsList_folders = this.$("gDocsList_folders");
            moreloader = this.$("moreloader");
            gdlistholder = this.$("gdlistholder");
            feedtype = this.$("feedtype");
            showtypes = this.$("showtypes");
            gdsearchform = this.$("gdsearchform");
            gdBrowser.init();
            folderHistory = new Array();
            foldertree = this.$("foldertree");
        }).bind(this)();
        
        
        debug("sidebar init...");
        var gdocsbarobserver = new Object();
        gdocsbarobserver.observe = (function(a,b,c){
            debug(c);
            switch(c){
                case "login-error":
                $("login_btn").setAttribute('disabled', false);
                error = a.wrappedJSObject;
                if(error['error'])
                    this.setLoginError(error);
                break;
                
                case "login-success":
                auth = a.wrappedJSObject.auth;
                this.initLoggedInUser(auth);
                break;
            }
        }).bind(this);
        this.gdocsbarobserver = gdocsbarobserver;
        nsIObserverService.addObserver(this.gdocsbarobserver, "gdocsbar", false);
        debug(gbarc.wrappedJSObject.loggedIn);
        if(gbarc.wrappedJSObject.loggedIn){
            this.initLoggedInUser(gbarc.getSignedRequestHeader());
        }
    },
    initLoggedInUser: function(auth){
        page_login.setAttribute('collapsed', true);
        page_list.setAttribute('collapsed', false);
        gdListAPI.init(auth);
        this.getFullDocList();
        this.getFolderList();
    },
    setFolder: function(folderid, back){
        gdlistholder.setAttribute('folder', folderid);
        if(!back)
            folderHistory.push(folderid);
        this.getFullDocList();
        this.getFolderList();
    },
    goBackFolder: function(){
        folderHistory.pop();
        if(folderHistory.length > 0)
            this.setFolder(folderHistory[folderHistory.length -1], true);
        else
        {
            gdlistholder.removeAttribute('folder');
            this.getFullDocList();
            this.getFolderList();
        }
    },
    getQueryParams: function(){
        var types = {};
        types.feedtype = feedtype.value;
        types.showtype = showtypes.value;
        
        if(gdlistholder.getAttribute('folder'))
            types.folder = gdlistholder.getAttribute('folder');
        
        a = false;
        var b = gdsearchform.getQueryParams();        
        //debug(b);
        if(b.title){
            if(b.queryText.length > 0){
                var a = {};
                a.title = b.queryText;
                a['title-exact'] = b['title-exact'];
            }
        }else if(b.queryText.length > 0){
            var a = {};
            a.q = b.queryText;
        }
        
        
        var out = {}
        out.types = types;
        
        out.query = a;
        //debug(out.query);
        return out;
    },
    getMoreDocuments: function(){
        /*
        debug("getting more...");
        this.addClass(gdlistholder, "loading");
        gdListAPI.getMoreDocuments(this.displayPartialDocList.bind(this) , function(){ debug("error"); });
        */
        this.addClass(gdlistholder, "loading");
        q = this.getQueryParams();
        q.query = {}
        q.query['start-index'] = parseInt(gdlistholder.getAttribute('startindex')) + parseInt(gdlistholder.getAttribute('numshowing'));
        //debug("got query...", q);
        gdListAPI.getAllDocuments(q.types, (q.query ? q.query : null), this.displayPartialDocList.bind(this) , function(code, data){ debug(code +", "+ data); });
        
    },
    getFullDocList: function(){
        debug("setting up requests...");
        gdlistholder.clearContents();
        this.addClass(gdlistholder, "loading");
        q = this.getQueryParams();
        gdListAPI.getAllDocuments(q.types, (q.query ? q.query : null), this.displayDocList.bind(this) , function(code, data){ debug(code +", "+ data); });
    },
    refreshDocumentFeed: function(){
        gdlistholder.clearContents();
        this.addClass(gdlistholder, "loading");
        q = this.getQueryParams();
        q.query['last-index'] = 1;
        gdListAPI.getAllDocuments(q.types, (q.query ? q.query : null), this.displayDocList.bind(this) , function(code, data){ debug(code +", "+ data); });
    },
    displayRefreshedFeed: function(){
        
    },
    parsePartialDocFeed: function(data){
        try{
            result = JSON.fromString(data);
            var documentFeed = new gdFeed(result);
            this.displayPartialDocList(documentFeed);
        }
        catch(e){
            debug("Exception: "+e);
        }
    },
    parseDocFeed: function(data){
        try{
            result = JSON.fromString(data);
            var documentFeed = new gdFeed(result);
            this.displayDocList(documentFeed);
        }
        catch(e){
            debug("Exception: "+e);
        }
    },
    displayPartialDocList: function(result){
        _gdFeed = new gdFeed(result);
        this.removeClass(gdlistholder, "loading");
        if(_gdFeed.entries.length < 1){
            gdlistholder.setAttribute("empty", true);
            return false;
        }
        gdlistholder.removeAttribute("empty");
        debug(_gdFeed.total);
        entries = _gdFeed.entries;


        for(var i=0; i<entries.length; i++){
            var entry = this.makegdocument(entries[i]);
            //gDocsList_list.insertBefore(entry, moreloader);
            gdlistholder.appendChild(entry);
        }
        gdlistholder.removeAttribute("empty");
        gdlistholder.setAttribute('total', _gdFeed.total);
        gdlistholder.setAttribute('startindex', _gdFeed.startIndex);
        gdlistholder.startindex = _gdFeed.startIndex;

    },
    displayDocList: function(result){
        _gdFeed = new gdFeed(result);
        this.removeClass(gdlistholder, "loading");
        if(_gdFeed.entries.length < 1){
            gdlistholder.setAttribute("empty", true);
            return false;
        }
        gdlistholder.removeAttribute("empty");
//        debug(_gdFeed.total);
        entries = _gdFeed.entries;
//        debug("hello");

        for(var i=0; i<entries.length; i++){
            var entry = this.makegdocument(entries[i]);
            //gDocsList_list.insertBefore(entry, moreloader);
            gdlistholder.appendChild(entry);
        }

        debug(_gdFeed.etag);
        gdlistholder.setAttribute('etag', _gdFeed.etag);
        gdlistholder.removeAttribute("empty");
        gdlistholder.setAttribute('total', _gdFeed.total);
        gdlistholder.setAttribute('startindex', _gdFeed.startIndex);
        gdlistholder.startindex = _gdFeed.startIndex;

    },
    makegdocument: function(e){
        d = document.createElement("gdocument");
        d.setAttribute("context", "gdocumentmenu");
//        d.setAttribute("mode", "edit");
        d.setAttribute("name", e.title);
        d.setAttribute("star", e.starred ? "star" : "nostar");
        d.setAttribute("_hidden", e.hidden);
        var monthname=new Array("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")
        datestring = this.zeroPadding(e.updated.getMonth()+1) + "/" + this.zeroPadding(e.updated.getDate());
        d.setAttribute("datetime", datestring);
        d.setAttribute("author", e.authors[0].name);
        d.setAttribute("edit", e.editLink);
        d.setAttribute("etag", e.etag);
        d.setAttribute("type", e._type);
        d.setAttribute("resourceId",e.resourceId.split(':')[1]);
        d.setAttribute("resource",e._type);
        this.addClass(d, e._type);
        //this.addClass(d, "edit");
        return d;
    },
    prepareFoldersForMove: function(){
        foldertree.openPopup(document.popupNode, "at_pointer");
        if(!foldertree.getAttribute('init'))
            this.initTreeFolders();
    },
    moveToFolder: function(){
        var tree = document.getElementById("myTree");
          item = tree.view.getItemAtIndex(tree.currentIndex);
            folder = item.firstChild.firstChild.getAttribute('folder');
            if(!folder){
                return ;
            }
        debug(folder, document.popupNode);
    },
    initTreeFolders: function(){
       /* gbarc = Components.classes["@gdocsbar.com/gdocsbar;1"].getService(Components.interfaces.nsIGdocsBar);
        auth = gbarc.getSignedRequestHeader();
        gdListAPI.init(auth);
*/
        foldertree.setAttribute('init', 'done');
        var types = {};
        types['feedtype'] = "folder"
        
        gdListAPI.getAllDocuments(types, {showfolders: true}, this.displayFolderListTree.bind(this) , function(code, data){ debug(code +", "+ data); });
    },
    navigateFolder: function(event){
        var tree = document.getElementById("myTree");
          var tbo = tree.treeBoxObject;

          // get the row, col and child element at the point
          var row = { }, col = { }, child = { };
          tbo.getCellAt(event.clientX, event.clientY, row, col, child);

          var cellText = tree.view.getCellText(row.value, col.value);
          debug(event);
          
          item = tree.view.getItemAtIndex(row.value);
            //debug(item.firstChild.firstChild.id);
            folder = item.firstChild.firstChild.getAttribute('folder');
            if(!folder){
                return ;
            }
            var types = {};
            types['feedtype'] = "folder";
            types['folder'] = folder;
            gdListAPI.getAllDocuments(types, {showfolders: true}, (function(data){ debug(this.folder, data); this.scope.displayFolderListTree(data, this.folder); }).bind({'folder': folder, scope: this}) , function(code, data){ debug(code +", "+ data); });
            
    },
    displayFolderListTree: function(data, folder){
        
        _gdFeed = new gdFeed(result);
        
        if(folder){
            var c = document.getElementById( "f_" + folder ).parentNode.parentNode.getElementsByTagName("treechildren");
            if(c.length > 0)
                c[0].parentNode.removeChild(c[0]);
        }
        
        if(_gdFeed.entries.length ==0 && folder){
            treechildren = document.createElement("treechildren");
            var treeitem = document.createElement("treeitem");
            var treerow = document.createElement("treerow");
            var treecell = document.createElement("treecell");

            treecell.setAttribute('label', "[No folders found]");
            treecell.setAttribute('disabled', true);
//           treecell.setAttribute('id', e.resourceId);
            treeitem.setAttribute('container', false);
            treerow.appendChild(treecell);
            treerow.setAttribute('disabled', true);
            treeitem.appendChild(treerow);
            
            treeitem.setAttribute('disabled', true);
            treechildren.appendChild(treeitem);
            document.getElementById( "f_" + folder ).parentNode.parentNode.appendChild(treechildren);
            return;
        }
        
        if(folder){
            treechildren = document.createElement("treechildren");
        }
        
        for( var i=0; i < _gdFeed.entries.length; i++){
            debug("inside folder loop");
            e = _gdFeed.entries[i];
            if(e.folders.length != 0 && !folder)
            {
                continue;
            }
            var treeitem = document.createElement("treeitem");
            var treerow = document.createElement("treerow");
            
            
            var treecell = document.createElement("treecell");
            treecell.setAttribute('label', e.title);
            treecell.setAttribute('folder', e.resourceId);
            treecell.setAttribute('id', "f_" + e.resourceId);
            treeitem.setAttribute('container', true);
            treerow.appendChild(treecell);
            treeitem.appendChild(treerow);
            
            if(folder){
                treechildren.appendChild(treeitem);
            }
            else
                this.$("foldertreechildren").appendChild(treeitem);
        }
        if(folder){
            document.getElementById( "f_" + folder ).parentNode.parentNode.appendChild(treechildren);
        }
    },
    getFolderList: function(){
        
        while(gDocsList_folders.childNodes.length > 0){
            gDocsList_folders.removeChild(gDocsList_folders.firstChild);
        }
        
        var types = {};
        types['feedtype'] = "folder"
        if(gdlistholder.getAttribute('folder'))
            types.folder = gdlistholder.getAttribute('folder');
            
        gdListAPI.getAllDocuments(types, {showfolders: true}, this.displayFolderList.bind(this) , function(code, data){ debug(code +", "+ data); });
    },
    displayFolderList: function(data){
        debug(data);
        _gdFeed = new gdFeed(result);
        debug("folder result...");
        for( var i=0; i < _gdFeed.entries.length; i++){
            e = _gdFeed.entries[i];
            if(e.folders.length != 0 && !gdlistholder.hasAttribute('folder'))
            {
                continue;
            }
            var f = document.createElement("gfolder");
            f.setAttribute('title', e.title);
            f.setAttribute('id', e.resourceId);
            f.setAttribute('onclick', "gbar.setFolder(this.getAttribute('id'));")
            gDocsList_folders.appendChild(f);
        }
    },
    destruct: function(){
      nsIObserverService.removeObserver(this.gdocsbarobserver, "gdocsbar");
    },
    login: function(){
        for(var i=0; i<le_holder.childNodes.length; i++){
            le_holder.childNodes[i].setAttribute('collapsed', true);
        }
        debug($("email").value, $("password").value);
        gbarc.login($("email").value, $("password").value, $("captcha_textbox").value);
        $("login_btn").setAttribute('disabled', true);
    },
    cancelLogin: function(){
        for(var i=0; i<le_holder.childNodes.length; i++){
            le_holder.childNodes[i].setAttribute('collapsed', true);
        }
        $("email").value = "";
        $("password").value = "";
    },
    setLoginError: function(error){
        error_id = "le_"+error['error'];
        $(error_id).setAttribute('collapsed', false);
        $("captcha_image").setAttribute('src',"http://www.google.com/accounts/" + error['captchaurl']);
    },
    toggleSearchBox: function(){
        if(gdsearchform.hasAttribute('collapsed')){
            gdsearchform.removeAttribute('collapsed');
        }
        else{
            gdsearchform.setAttribute('collapsed', true );
        }
    },
    renameDocument: function(el, newName){
        editLink = el.getAttribute('edit');
        etag = el.getAttribute('etag');
        outStr = gAtomFeed.updateTitle(newName);
        
    }
});


/*Components.utils.import("resource://gre/modules/JSON.jsm");

GDOCSBARUtils.ns(function(){ with(GDOCSBARUtils){
    const gbarc = CCSV('@gdocsbar.com/gdocsbar;1', 'nsIGdocsBar');
    const nsIObserverService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    const le_holder = $("le_holder");
    const page_list = $("gDocsList");
    const page_login = $("gDocsBarLogin");
    const gDocsList_list = $("gDocsList_list");
    
    top.gbar = {
        init: function(){
            //gbarc.reload();
            //gbarc.init();
            debug("sidebar init...", true);
            var gdocsbarobserver = new Object();
            gdocsbarobserver.observe = (function(a,b,c){
                debug(c);
                switch(c){
                    case "login-error":
                    $("login_btn").setAttribute('disabled', false);
                    error = a.wrappedJSObject;
                    if(error['error'])
                        this.setLoginError(error);
                    break;
                    
                    case "login-success":
                    auth = a.wrappedJSObject.auth;
                    this.initLoggedInUser(auth);
                    break;
                }
            }).bind(this);
            this.gdocsbarobserver = gdocsbarobserver;
            nsIObserverService.addObserver(this.gdocsbarobserver, "gdocsbar", false);
            debug(gbarc.wrappedJSObject.loggedIn);
            if(gbarc.wrappedJSObject.loggedIn){
                this.initLoggedInUser(gbarc.getSignedRequestHeader());
            }
        },
        initLoggedInUser: function(auth){
            page_login.setAttribute('collapsed', true);
            page_list.setAttribute('collapsed', false);
            gdListAPI.init(auth);
            this.getFullDocList();
            //this.getFolderList();
        },
        getFullDocList: function(){
            debug("setting up requests...");
            gdListAPI.getAllDocuments(null, this.parseDocFeed.bind(this) , function(){ debug("error"); });
        },
        parseDocFeed: function(data){
            try{
                result = JSON.fromString(data);
                var documentFeed = new gdFeed(result);
                this.displayDocList(documentFeed);
            }
            catch(e){
                debug("Exception: "+e);
            }
        },
        displayDocList: function(gdFeed){
            if(gdFeed.entries.length < 1){
                return false;
            }
            
            entries = gdFeed.entries;
            
            for(var i=0; i<entries.length; i++){
                var entry = this.makegdocument(entries[i]);
                gDocsList_list.appendChild(entry);
            }
        },
        makegdocument: function(e){
            d = document.createElement("gdocument");
            d.setAttribute("context", "gdocumentmenu");
            d.setAttribute("class", e._type);
            d.setAttribute("name", e.title);
            d.setAttribute("star", e.starred ? "star" : "nostar");
            var monthname=new Array("Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec")
            datestring = monthname[e.updated.getMonth()] + " " + e.updated.getDate();
            d.setAttribute("datetime", datestring);
            d.setAttribute("author", e.authors[0].name);
            return d;
        },
        getFolderList: function(){
            
            req = gbarc.setupRequest("http://docs.google.com/feeds/documents/private/full/-/folder?showfolders=true&alt=json", true);
            req = req.wrappedJSObject;
            //debug(req);
            req.onreadystatechange = (function (aEvt) {
        	    if (req.readyState == 4) {
        	        
        		     if(req.status == 200){
        		         debug(req.responseText);
             	         debug(req.status);
        	         }else{
        	             
        	         }

                 }
            }).bind(this);
            req.send(null);
        },
        destruct: function(){
          nsIObserverService.removeObserver(this.gdocsbarobserver, "gdocsbar");
        },
        login: function(){
            for(var i=0; i<le_holder.childNodes.length; i++){
                le_holder.childNodes[i].setAttribute('collapsed', true);
            }
            debug($("email").value, $("password").value);
            gbarc.login($("email").value, $("password").value, $("captcha_textbox").value);
            $("login_btn").setAttribute('disabled', true);
        },
        cancelLogin: function(){
            for(var i=0; i<le_holder.childNodes.length; i++){
                le_holder.childNodes[i].setAttribute('collapsed', true);
            }
            $("email").value = "";
            $("password").value = "";
        },
        setLoginError: function(error){
            error_id = "le_"+error['error'];
            $(error_id).setAttribute('collapsed', false);
            $("captcha_image").setAttribute('src',"http://www.google.com/accounts/" + error['captchaurl']);
        }
    }
} });*/
