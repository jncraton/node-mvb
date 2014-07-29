#!/usr/bin/node

var fs = require('fs');

var express = require('express');
var marked = require('marked');

var conf = require('./conf.json');

var app = express();

var root = 'pages/';
var template = fs.readFileSync('template.html', 'utf-8');
var style = fs.readFileSync('style.css', 'utf-8');

template = template.replace('{{ style }}', minifyCSS(style));

var pages = {};
    
function minifyCSS (css) {
    css = css.replace(/\n +/g, '\n')
    css = css.replace(/\n\n+/g, '\n')
    css = css.replace(/;\n+/g, ';')
    css = css.replace(/, +/g, ',')
    css = css.replace(/: +/g, ':')
    css = css.replace(/[\n ]*{[\n ]*/g, '{')
    css = css.replace(/,\n+/g, ',')
    css = css.replace(/}\n+/g, '}')
    css = css.replace(/{[\n\t ]+/g, '{')
    css = css.replace(/;[\n\t ]+/g, ';')
    css = css.replace(/;}/g, '}')
    
    return css;
}

function minifyHTML (html) {
    if (html.indexOf('<pre') == -1) {
        html = html.replace(/\n[\t ]+/g, '\n')
        html = html.replace(/>\n+/g, '>')
    }
    
    return html;
}

function getFirstImage(page) {
    var img = page.content.match('<img src="(.*?)"')
    
    if (img) {
        var full_path = page.canonicalUrl + '/' + page.slug + '/'
        return '<br/><img src="' + full_path + img[1] + '" />'
    } else {
        return ""
    }
}

function buildPageContent(page) {
    page.content = fs.readFileSync(page.localPath + '/content.md', 'utf-8')
    page.text = marked(page.content).replace(/\<.*?\>/g, '');
    
    try {
        page.title = page.content.match(/# (.*?)\n/)[1];
        page.text = page.text.replace(page.title, '');
    } catch (e) {
        page.title = conf.title;
    }
    
    var words = page.text.split(' ');
    
    if (words.length > 50) {
        page.shortText = words.splice(0, 50).join(' ') + '...';
    } else {
        page.shortText = '';
    }
    
    script = '';
    
    if (fs.existsSync(page.localPath + '/script.js')) {
        script = '\n' + fs.readFileSync(page.localPath + '/script.js', 'utf-8') + '\n';
    }
    
    page.content = template.replace('{{ content }}', marked(page.content) + script);
    
    page.content = page.content.replace('{{ title }}', page.title);

    page.content = page.content.replace('{{ parentUrl }}', '/' + page.parent);
    page.content = page.content.replace('{{ parentLink }}', '<a href="/' + page.parent + '">' + page.parent + '</a>');

    page.content = page.content.replace(/{{ canonicalUrl }}/g, conf.baseUrl + page.canonicalUrl);
    
    if (!page.id) {
        var children = [];

        Object.keys(page).forEach(function (id) {
            if (!isNaN(id)) {
                children.push(page[id])
            }
        });
        
        children.sort(function (a, b) {
            return b.id - a.id;
        });
        
        var childrenHtml = '';
        
        for (var i = 0; i < children.length; i++) {
            childrenHtml += '<h2><a href="' + children[i].canonicalUrl + '/">' + 
                children[i].title + '</h2>' +
                '<a href="' + children[i].canonicalUrl + '/">' + getFirstImage(children[i]) + '</a><br />' +
                children[i].shortText
        }


        page.content = page.content.replace('{{ children }}', childrenHtml);
    } else {
        page.content = page.content.replace('{{ children }}', '');
    }
    
    if (children) {
        page.content = page.content.replace(/{% if nochildren %}[\s\S]*?{% endif %}/mg, '');
    }
    
    if (!page.parent) {
        page.content = page.content.replace(/{% if parent %}[\s\S]*?{% endif %}/mg, '');
    }
    
    page.content = page.content.replace(/{% .*? %}/mg, '');
    
    page.content = minifyHTML(page.content);

    return page;
}

function loadPages() {
    fs.readdirSync(root).forEach(function (parent) {
        if (parent == 'content.md') {
            pages['root'] = buildPageContent({
                localPath: root,
                slug: '',
                canonicalUrl: '/',
                parent: ''
            });
        } else if (parent.indexOf('.') == -1) {
            pages[parent] = buildPageContent({
                localPath: root + parent,
                slug: parent,
                canonicalUrl: '/' + parent,
                parent: ''
            });

            fs.readdirSync(pages[parent].localPath).forEach(function (child) {
                var parts = child.match(/(\d+)\-(.*)/);

                if (parts) {
                    var id = parts[1];
                    var slug = parts[2];

                    pages[parent][id] = buildPageContent({
                        id: id,
                        localPath: root + parent + '/' + id + '-' + slug,
                        canonicalUrl: '/' + parent + '/' + id,
                        slug: parts[2],
                        parent: parent
                    });
                }
            });
            
            pages[parent] = buildPageContent(pages[parent]);
        }
    });
}

loadPages();

function genPage(res, parent, id, slug) {
    var page;
    var status = 200;
    
    if (parent) {
        if (id) {
            page = pages[parent][id]
            if (page.slug != slug) {
                res.redirect(301, page.canonicalUrl);                
                return;
            }
        } else {
            page = pages[parent];
        }
    } else {
        page = pages['root'];
    }
    
    if (!page) {
        page = {
            content: 'Not Found',
            title: 'Not Found'
        };
        status = 404;
    }

    res.send(status, page.content);
}

app.get('/', function(req, res){
    genPage(res);
});

app.get('/:parent', function(req, res){
    genPage(res, req.params.parent);
});

app.get('/:parent/:id', function(req, res){
    if (!isNaN(req.params.id)) {
        res.redirect(301, '/' + req.params.parent + '/' + req.params.id + '/' + pages[req.params.parent][req.params.id].slug + '/');
    } else {
        // Assume that the form is /:parent/:slug and redirect

        Object.keys(pages[req.params.parent]).forEach(function (id) {
            var slug = pages[req.params.parent][id].slug
            
            if (!isNaN(id) && slug == req.params.id) {
                res.redirect(301, '/' + req.params.parent + '/' + id + '/' + slug + '/');
            }
        });
    }
});

app.get('/:parent/:id/:slug/', function(req, res){
    genPage(res, req.params.parent, req.params.id, req.params.slug);
});

if (conf.serveStatic == 'true') {
    app.get('/:parent/:id/:slug/:file', function(req, res){
        res.sendfile(root + req.params.parent + '/' + req.params.id + '-' + pages[req.params.parent][req.params.id].slug + '/' + req.params.file);
    });    
}

app.get('/:parent/:id/:slug', function(req, res){
    if (! (pages[req.params.parent] && pages[req.params.parent][req.params.id])) {
        res.send(404, 'Not Found');
    } else {
        res.redirect(301, '/' + req.params.parent + '/' + req.params.id + '/' + pages[req.params.parent][req.params.id].slug + '/');
    }
});

app.listen(conf.port);
console.log('Server running at http://127.0.0.1:' + conf.port);