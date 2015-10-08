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
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = (d + Math.random()*16)%16 | 0;
        d = Math.floor(d/16);
        return (c=='x' ? r : (r&0x3|0x8)).toString(16);
    });
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
    var inputs   = clone.querySelectorAll('[bib-dataField]');
    var labels   = clone.querySelectorAll('label');

    for (i = 0; element = inputs[i++]; ) {
        // add prefix to input 'id'
        if (element.id) {
            element.id = prefix + element.id;
        }
        // add prefix to input 'name'
        if (element.getAttribute('name')) {
            element.setAttribute('name', prefix + element.name);
        }
    }
    // add prefix to label 'for'
    for (i = 0; element = labels[i++]; ) {
        if (element.getAttribute('for')) {
            element.setAttribute('for', prefix + element.getAttribute('for'));
        }
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

    if (!entity._id) {
        throw new Error('invalid entity (missing id)');
    }

    // find target by entity id
    target = this.getEntityRoot().querySelector('[bib-_id="' + entity._id + '"]');
    if (!target) {
        throw new Error('could not find target for entity id : ' + entity._id);
    }

    this.setEntityData(target, entity, error);

    return target;
};

$.bib.insertEntity = function(entity, error)
{
    var target;

    if (!entity.type) {
        throw new Error('invalid entity (missing type)');
    }

    // find empty entity target
    target = this.getEntityRoot().querySelector('[bib-entity=' + entity.type + ']');
    if (!target) {
        throw new Error('could not find target for entity type : ' + entity.type);
    }
    if (target.getAttribute('bib-_id')) {
        throw new Error('could not find empty target for entity type : ' + entity.type);
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

$.bib.deleteEntity = function(target)
{
    var id;
    var rev;
    var type;
    var deleteURL;

    // find the entity we are inside of
    if (target) {
        while (!target.hasAttribute('bib-entity')) {
            target = target.parentNode;
        }
    } else {
        throw new Error('invalid target');
    }

    // get id
    id = target.getAttribute('bib-_id');

    // get revision
    rev = target.getAttribute('bib-_rev');

    // get type
    type = target.getAttribute('bib-entity');

    console.log(id, rev, type);

    // check if we can delete
    if (!id || !rev || !type) {
        throw new Error('entity to be deleted requires id, rev and type');
    }

    // set URL
    deleteURL = '/' + type + '/' + id + '?rev=' + rev;

    // kill it with fire
    $.ajax({
        url: deleteURL,
        type: 'DELETE',
        success: this.replyHandler
    });
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
    $.post(persistURL, {payload:JSON.stringify(data)}, this.replyHandler);
};

$.bib.replyHandler = function(data, status)
{
    var i;

    console.log(data);
    console.log(status);

    if (data) {
        // display page error
        if (data.error) {
            //TODO!
        }

        // display page message
        if (data.message) {
            //TODO!
        }

        // set entity data and error states
        if (data.entities) {
            for (i in data.entities) {
                if (data.entities.hasOwnProperty(i)) {
                    $.bib.updateEntity(data.entities[i].entity, data.entities[i].error);
                }
            }
        }

        // update URL
        if (data.pushState) {
            window.history.pushState(data.pushState.state, data.pushState.title, data.pushState.url);
        }
        if (data.redirectURL) {
            window.location.href = data.redirectURL;
        }
    }
};

$.bib.clearEntityData = function(target)
{
    if (!target) {
        throw new Error('invalid entity target');
    }

    var i;
    var id;
    var element;
    var value;
    var inputs = target.querySelectorAll('[bib-dataField]');

    // remove id
    target.removeAttribute('bib-_id');

    // remove revision
    target.removeAttribute('bib-_rev');

    // set inputs
    for (i = 0; element = inputs[i++]; ) {
        value = element.getAttribute('bib-defaultValue') || '';
        switch (element.tagName.toLowerCase()) {
            case 'input':
                switch (element.type) {
                    case 'checkbox':
                    case 'radio':
                        element.checked = element.hasAttribute('bib-defaultChecked');
                        break;
                    default:
                        element.value = value;
                }
                break;
            case 'textarea':
                element.value = value;
                break;
            case 'image':
            case 'iframe':
                element.src = value;
                break;
            default:
                element.innerHTML = value;
        }
    }

    // clear error states
    //TODO!!!!
};

$.bib.setEntityData = function(target, data, error)
{
    if (!target) {
        throw new Error('invalid entity target');
    }

    var i;
    var id;
    var element;
    var field;
    var inputs = target.querySelectorAll('[bib-dataField]');

    // set target id
    if (!target.getAttribute('bib-_id')) {
        if (data.hasOwnProperty('_id') && data._id) {
            target.setAttribute('bib-_id', data._id);
        } else {
            target.setAttribute('bib-_id', this.getGUID());
        }
    }

    // set revision
    if (data._rev) {
        target.setAttribute('bib-_rev', data._rev);
    }

    // set inputs
    for (i = 0; element = inputs[i++]; ) {
        field = element.getAttribute('bib-dataField');
        if (field && data.hasOwnProperty(field)) {
            switch (element.tagName.toLowerCase()) {
                case 'input':
                    switch
                        (element.type)
                    {
                    case 'checkbox':
                        element.checked = ((data[field]) ? 'checked' : false);
                        break;
                    case 'radio':
                        if (data[field] === element.value) {
                            element.checked = true;
                        }
                        break;
                    default:
                        element.value = data[field];
                    }
                    break;
                case 'textarea':
                    element.value = data[field];
                    break;
                case 'image':
                case 'iframe':
                    element.src = data[field];
                    break;
                default:
                    element.innerHTML = data[field];
            }
        }
    }

    // set/unset error states
    //TODO!!!!
};

$.bib.getEntityData = function(target)
{
    if (!target) {
        throw new Error('invalid entity target');
    }

    var i;
    var element;
    var field;
    var inputs = target.querySelectorAll('[bib-dataField]');
    var data   = {};

    // get id
    if (!target.getAttribute('bib-_id')) {
        target.setAttribute('bib-_id', this.getGUID());
    }
    data._id = target.getAttribute('bib-_id');

    // get revision
    if (target.getAttribute('bib-_rev')) {
        data._rev = target.getAttribute('bib-_rev');
    }

    // get inputs
    for (i = 0; element = inputs[i++]; ) {
        field = element.getAttribute('bib-dataField');
        if (field) {
            switch (element.tagName.toLowerCase()) {
                case 'input':
                    switch (element.type) {
                        case 'checkbox':
                            data[field] = ((element.checked) ? 1 : 0);
                            break;
                        case 'radio':
                            if (element.checked) {
                                data[field] = element.value;
                            }
                            break;
                        default:
                            data[field] = element.value;
                    }
                    break;
                case 'textarea':
                    data[field] = element.value;
                    break;
                default:
                    // we do not get data values from non-input elements
            }
        }
    }

    return data;
};
