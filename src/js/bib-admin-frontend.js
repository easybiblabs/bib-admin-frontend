//----------------------------------------------------------------------------//
/* bib-admin-frontend
 *
 * (c) Copyright 2015 ImagineEasy
 *
 * author    : Flame Herbohn
 * email     : flame.herbohn@imagineeasy.com
 * download  : https://github.com/easybiblabs/bib-admin-frontend
 * license   : BSD
 */
//----------------------------------------------------------------------------//

//Make sure jQuery has been loaded
if ('undefined' === typeof jQuery) {
    throw new Error('bib-admin-frontend requires jQuery');
}

$.bib = {};
$.bib.uid = 0;

// find entity container
$.bib.getEntityRoot = function()
{
    return document.querySelector('[bib-entityRoot]');
};

// find template container
$.bib.getTemplateRoot = function()
{
    return document.querySelector('[bib-templateRoot]');
};

$.bib.getUID = function()
{
    return this.uid++;
};

$.bib.getGUID = function()
{
    var d = Date.now();
    var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
    return uuid;
};

$.bib.addEntity = function(entity, error)
{
    var i;
    var element;
    var type;
    var prefix = this.getUID();

    // entity could be entity data (object) or an entity name (string)
    if ('string' === typeof entity) {
        type = entity;
        entity = null;
    } else if (entity.hasOwnProperty('type')) {
        type = entity.type;
    } else {
        throw new Error('invalid entity');
    }

    var template = this.getTemplateRoot().querySelector('[bib-template=' + type + ']');
    var target   = this.getEntityRoot().querySelector('[bib-entityContainer=' + type + ']');

    // clone template
    var clone    = template.cloneNode(true);
    var inputs   = clone.querySelectorAll('input');
    var labels   = clone.querySelectorAll('label');

    // add prefix to input 'id'
    for (i = 0; element = inputs[i++]; ) {
        element.id = prefix + element.id;
    }
    // add prefix to label 'for'
    for (i = 0; element = labels[i++]; ) {
        element.setAttribute('for', prefix + element.getAttribute('for'));
    }

    // fill in form data from entity
    if (entity||error) {
        this.setEntityData(clone, entity, error);
    }

    // append template to target
    if (target.hasAttribute('bib-newEntityFirst')) {
        target.insertBefore(clone, target.firstChild);
    } else {
        target.appendChild(clone);
    }

    return clone;
};

$.bib.updateEntity = function(entity, error)
{
    var target;
    var err;

    // find target
    if (entity.hasOwnProperty('_id') && entity._id) {
        // find by entity id
        target = document.getElementById(entity._id);
        err  = 'could not find target for entity id : ' + entity._id;
    } if (entity.hasOwnProperty('type')  && entity.type) {
    // find first empty entity target
    target = this.getEntityRoot().querySelector('[bib-entity=' + entity.type + ']');
    err  = 'could not find target for entity type : ' + entity.type;
} else {
    throw new Error('invalid entity');
}

    if (!target) {
        throw new Error(err);
    }

    this.setEntityData(target, entity, error);

    return target;
};

$.bib.removeEntity = function(target)
{
    while (!target.hasAttribute('bib-template')) {
        target = target.parentNode;
    }
    target.parentNode.removeChild(target);

    return target;
};

$.bib.persist = function(target)
{
    var i;
    var element;
    var entities;
    var type;
    var persistURL;
    var data = {};

    // find the nearest persist element, or just use the entity root
    if (target) {
        while (!target.hasAttribute('bib-persist') || !target.hasAttribute('bib-entityRoot')) {
            target = target.parentNode;
        }
    } else {
        target = this.getEntityRoot();
    }

    // get data from all entities within the persist element
    entities = target.querySelectorAll('[bib-entity]');
    for (i = 0; element = entities[i++]; ) {
        type = element.getAttribute('bib-entity');
        if (!data.hasOwnProperty(type)) {
            data[type] = [];
        }
        data[type].push(this.getEntityData(element));
    }

    // get the persist URL (or use the current URL)
    persistURL = target.getAttribute('bib-persist');
    if (!persistURL) {
        persistURL = window.location.href;
    }

    // persist it like you stole it
    $.post(persistURL, data, this.replyHandler);
};

$.bib.replyHandler = function(data, status)
{
    console.log(data);
    console.log(status);
};

$.bib.clearEntityData = function(target)
{
    if ('string' === typeof target) {
        target = document.getElementById(target);
    }
    if (!target) {
        throw new Error('invalid entity target');
    }

    var i;
    var id;
    var element;
    var inputs = target.querySelectorAll('input');

    // set target id
    target.removeAttribute('id');

    // set inputs
    for (i = 0; element = inputs[i++]; ) {
        if (element.getAttribute('bib-dataField')) {
            switch (element.type) {
                case 'checkbox':
                    element.checked = element.hasAttribute('bib-defaultChecked')
                    break;
                default:
                    element.value = '';
            }
        }
    }

    // clear error states
    //TODO!!!!
};

$.bib.setEntityData = function(target, data, error)
{
    if ('string' === typeof target) {
        target = document.getElementById(target);
    }
    if (!target) {
        throw new Error('invalid entity target');
    }

    var i;
    var id;
    var element;
    var field;
    var inputs = target.querySelectorAll('input');

    // set target id
    if (!target.id) {
        if (data.hasOwnProperty('_id') && data._id) {
            target.id = data._id;
        } else {
            target.id = this.getGUID();
        }
    }

    // set inputs
    for (i = 0; element = inputs[i++]; ) {
        field = element.getAttribute('bib-dataField');
        if (field && data.hasOwnProperty(field)) {
            switch (element.type) {
                case 'checkbox':
                    if (data[field]) {
                        element.checked = true;
                    } else {
                        element.checked = false;
                    }
                    break;
                default:
                    element.value = data[field];
            }
        }
    }

    // set/unset error states
    //TODO!!!!
};

$.bib.getEntityData = function(target)
{
    if ('string' === typeof target) {
        target = document.getElementById(target);
    }
    if (!target) {
        throw new Error('invalid entity target');
    }

    var i;
    var element;
    var field;
    var inputs = target.querySelectorAll('input');
    var data   = {};

    // get id
    if (!target.id) {
        target.id = this.getGUID();
    }
    data._id = target.id;

    // get inputs
    for (i = 0; element = inputs[i++]; ) {
        field = element.getAttribute('bib-dataField');
        if (field) {
            switch (element.type) {
                case 'checkbox':
                    if (element.checked) {
                        data[field] = 1;
                    } else {
                        data[field] = 0;
                    }
                    break;
                default:
                    data[field] = element.value;
            }
        }
    }

    return data;
};
