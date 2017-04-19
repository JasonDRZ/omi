/**
 * sodajs v0.4.1 by dorsywang
 * Light weight but powerful template engine for JavaScript
 * Github: https://github.com/AlloyTeam/sodajs
 * MIT License
 */

;(function() {
    var valueoutReg = /\{\{([^\}]*)\}\}/g;

    var prefix = 'soda';
    var prefixReg = new RegExp('^' + prefix + '-')

    var classNameRegExp = function (className) {
        return new RegExp('(^|\\s+)' + className + '(\\s+|$)', 'g');
    };

    var addClass = function (el, className) {
        if (!el.className) {
            el.className = className;

            return;
        }

        if (el.className.match(classNameRegExp(className))) {
        } else {
            el.className += " " + className;
        }
    };

    var removeClass = function (el, className) {
        el.className = el.className.replace(classNameRegExp(className), "");
    };

    var getValue = function (_data, _attrStr) {
        CONST_REGG.lastIndex = 0;
        var realAttrStr = _attrStr.replace(CONST_REGG, function (r) {
            if (typeof _data[r] === "undefined") {
                return r;
            } else {
                return _data[r];
            }
        });

        if (_attrStr === 'true') {
            return true;
        }

        if (_attrStr === 'false') {
            return false;
        }

        var _getValue = function (data, attrStr) {
            var dotIndex = attrStr.indexOf(".");

            if (dotIndex > -1) {
                var attr = attrStr.substr(0, dotIndex);
                attrStr = attrStr.substr(dotIndex + 1);

                // ??��attrStr�Ƿ���???������ת��
                if (typeof _data[attr] !== "undefined" && CONST_REG.test(attr)) {
                    attr = _data[attr];
                }

                if (typeof data[attr] !== "undefined") {
                    return _getValue(data[attr], attrStr);
                } else {
                    var eventData = {
                        name: realAttrStr,
                        data: _data
                    };

                    triggerEvent("nullvalue", {
                        type: "nullattr",
                        data: eventData
                    }, eventData);

                    // �������
                    return "";
                }
            } else {

                // ??��attrStr�Ƿ���???������ת��
                if (typeof _data[attrStr] !== "undefined" && CONST_REG.test(attrStr)) {
                    attrStr = _data[attrStr];
                }

                var rValue;
                if (typeof data[attrStr] !== "undefined") {
                    rValue = data[attrStr];
                } else {
                    var eventData = {
                        name: realAttrStr,
                        data: _data
                    };

                    triggerEvent("nullvalue", {
                        type: "nullvalue",
                        data: eventData
                    }, eventData);

                    rValue = '';
                }

                return rValue;
            }
        };

        return _getValue(_data, _attrStr);
    };

    // ע��node
    var commentNode = function (node) {
    };

    // ��ʶ??
    var IDENTOR_REG = /[a-zA-Z_\$]+[\w\$]*/g;
    var STRING_REG = /"([^"]*)"|'([^']*)'/g
    var NUMBER_REG = /\d+|\d*\.\d+/g;

    var OBJECT_REG = /[a-zA-Z_\$]+[\w\$]*(?:\s*\.\s*(?:[a-zA-Z_\$]+[\w\$]*|\d+))*/g;
    var ATTR_REG = /\[([^\[\]]*)\]/g;
    var ATTR_REG_DOT = /\.([a-zA-Z_\$]+[\w\$]*)/g;

    var NOT_ATTR_REG = /[^\.|]([a-zA-Z_\$]+[\w\$]*)/g;

    var OR_REG = /\|\|/g;

    var OR_REPLACE = "OR_OPERATOR\x1E";

    var getRandom = function () {
        return "$$" + ~~(Math.random() * 1E6);
    };

    var CONST_PRIFIX = "_$C$_";
    var CONST_REG = /^_\$C\$_/;
    var CONST_REGG = /_\$C\$_[^\.]+/g;

    var getAttrVarKey = function () {
        return CONST_PRIFIX + ~~(Math.random() * 1E6);
    };

    var parseSodaExpression = function (str, scope) {
        // ��filter���д���
        str = str.replace(OR_REG, OR_REPLACE).split("|");

        for (var i = 0; i < str.length; i++) {
            str[i] = (str[i].replace(new RegExp(OR_REPLACE, 'g'), "||") || '').trim();
        }

        var expr = str[0] || "";
        var filters = str.slice(1);

        // ���ַ�����������??
        expr = expr.replace(STRING_REG, function (r, $1, $2) {
            var key = getRandom();
            scope[key] = $1 || $2;
            return key;
        });

        while (ATTR_REG.test(expr)) {
            ATTR_REG.lastIndex = 0;

            //��exprԤ��??
            expr = expr.replace(ATTR_REG, function (r, $1) {
                var key = getAttrVarKey();
                // ��???��?? Ϊ�ַ���??
                var attrName = parseSodaExpression($1, scope);

                // ��һ�������ǰ׺ ��ʾ�����Ա�??

                scope[key] = attrName;

                return "." + key;
            });
        }

        expr = expr.replace(OBJECT_REG, function (value) {
            return "getValue(scope,'" + value.trim() + "')";
        });


        var parseFilter = function () {
            var filterExpr = filters.shift();

            if (!filterExpr) {
                return;
            }

            var filterExpr = filterExpr.split(":");
            var args = filterExpr.slice(1) || [];
            var name = filterExpr[0] || "";

            var stringReg = /^'.*'$|^".*"$/;
            for (var i = 0; i < args.length; i++) {
                //����������ͽ����ж�
                if (OBJECT_REG.test(args[i])) {
                    args[i] = "getValue(scope,'" + args[i] + "')";
                } else {
                }
            }

            if (sodaFilterMap[name]) {
                args.unshift(expr);

                args = args.join(",");

                expr = "sodaFilterMap['" + name + "'](" + args + ")";
            }

            parseFilter();
        };

        parseFilter();

        var evalFunc = new Function("getValue", "sodaFilterMap", "return function sodaExp(scope){ return " + expr + "}")(getValue, sodaFilterMap);

        return evalFunc(scope);
    };

    var hashTable = {
        id2Expression: {},

        expression2id: {},

        getRandId: function () {
            return 'soda' + ~~(Math.random() * 1E5);
        }
    };

    // ����ָ��
    // ����attr
    var compileNode = function (node, scope) {
        // ���ֻ���ı�
        if (node.nodeType === 3) {
            node.nodeValue = node.nodeValue.replace(valueoutReg, function (item, $1) {
                /*
                 var id = hashTable.getRandId();

                 hashTable.id2Expression[id] = {
                 expression: $1,
                 el: child
                 };

                 hashTable.expression2id[$1] = {
                 id: id,
                 el: child
                 };
                 */


                return parseSodaExpression($1, scope);
            });
        }

        if (node.attributes) {
            // ָ���
            sodaDirectiveArr.map(function (item) {
                var name = item.name;

                var opt = item.opt;

                if (node.getAttribute(name) && node.parentNode) {
                    opt.link(scope, node, node.attributes);
                }
            });

            // ������� ���� prefix-*
            [].map.call(node.attributes, function (attr) {
                // ���dirctiveMap�еľ��������ٴ�??
                if (!sodaDirectiveMap[attr.name]) {
                    if (prefixReg.test(attr.name)) {
                        var attrName = attr.name.replace(prefixReg, '');

                        if (attrName) {
                            var attrValue = attr.value.replace(valueoutReg, function (item, $1) {
                                return parseSodaExpression($1, scope);
                            });

                            node.setAttribute(attrName, attrValue);
                        }

                        // �����������ﺬexpr ����
                    } else {
                        attr.value = attr.value.replace(valueoutReg, function (item, $1) {
                            return parseSodaExpression($1, scope);
                        });
                    }
                }
            });

        }

        [].map.call([].slice.call(node.childNodes, []), function (child) {
            compileNode(child, scope);
        });
    };

    var sodaDirectiveMap = {};

    var sodaFilterMap = {};

    var sodaDirectiveArr = [];

    var sodaDirective = function (name, func) {
        var name = prefix + '-' + name;
        sodaDirectiveMap[name] = func();

        sodaDirectiveArr.push({
            name: name,
            opt: sodaDirectiveMap[name]
        });
    };

    var sodaFilter = function (name, func) {
        sodaFilterMap[name] = func;
    };

    sodaFilter.get = function (name) {
        return sodaFilterMap[name];
    };

    sodaFilter("date", function (input, lenth) {
        return lenth;
    });

    sodaDirective('repeat', function () {
        return {
            priority: 10,
            compile: function (scope, el, attrs) {

            },
            link: function (scope, el, attrs) {
                var opt = el.getAttribute(prefix + '-repeat');
                var itemName;
                var valueName;

                var trackReg = /\s+by\s+([^\s]+)$/;

                var trackName;
                opt = opt.replace(trackReg, function (item, $1) {
                    if ($1) {
                        trackName = ($1 || '').trim();
                    }

                    return '';
                });


                var inReg = /([^\s]+)\s+in\s+([^\s]+)|\(([^,]+)\s*,\s*([^)]+)\)\s+in\s+([^\s]+)/;

                var r = inReg.exec(opt);
                if (r) {
                    if (r[1] && r[2]) {
                        itemName = (r[1] || '').trim();
                        valueName = (r[2] || '').trim();

                        if (!(itemName && valueName)) {
                            return;
                        }
                    } else if (r[3] && r[4] && r[5]) {
                        trackName = (r[3] || '').trim();
                        itemName = (r[4] || '').trim();
                        valueName = (r[5] || '').trim();
                    }
                } else {
                    return;
                }

                trackName = trackName || '$index';

                // ����Ҫ����һ??
                var repeatObj = getValue(scope, valueName) || [];

                var repeatFunc = function (i) {
                    var itemNode = el.cloneNode(true);

                    // ���ﴴ��??���µ�scope
                    var itemScope = {};
                    itemScope[trackName] = i;

                    itemScope[itemName] = repeatObj[i];

                    itemScope.__proto__ = scope;

                    itemNode.removeAttribute(prefix + '-repeat');

                    el.parentNode.insertBefore(itemNode, el);

                    // �������¼ӵ�dom, Ҫ������??
                    compileNode(itemNode, itemScope);

                };

                if ('length' in repeatObj) {
                    for (var i = 0; i < repeatObj.length; i++) {
                        repeatFunc(i);
                    }
                } else {
                    for (var i in repeatObj) {
                        if (repeatObj.hasOwnProperty(i)) {
                            repeatFunc(i);
                        }
                    }
                }

                el.parentNode.removeChild(el);

            }
        };
    });

    sodaDirective('if', function () {
        return {
            priority: 9,
            link: function (scope, el, attrs) {
                var opt = el.getAttribute(prefix + '-if');

                var expressFunc = parseSodaExpression(opt, scope);

                if (expressFunc) {
                } else {
                    // el.setAttribute("removed", "removed");
                    el.parentNode && el.parentNode.removeChild(el);
                }
            }
        };
    });

    sodaDirective('class', function () {
        return {
            link: function (scope, el, attrs) {
                var opt = el.getAttribute(prefix + "-class");

                var expressFunc = parseSodaExpression(opt, scope);

                if (expressFunc) {
                    addClass(el, expressFunc);
                } else {
                }
            }
        };
    });

    sodaDirective('src', function () {
        return {
            link: function (scope, el, attrs) {
                var opt = el.getAttribute(prefix + "-src");

                var expressFunc = opt.replace(valueoutReg, function (item, $1) {
                    return parseSodaExpression($1, scope);
                });

                if (expressFunc) {
                    el.setAttribute("src", expressFunc);
                } else {
                }
            }
        };
    });

    sodaDirective('bind-html', function () {
        return {
            link: function (scope, el, attrs) {
                var opt = el.getAttribute(prefix + "-bind-html");
                var expressFunc = parseSodaExpression(opt, scope);

                if (expressFunc) {
                    el.innerHTML = expressFunc;

                    return {
                        command: "childDone"
                    };
                }
            }
        };
    });

    sodaDirective('html', function () {
        return {
            link: function (scope, el, attrs) {
                var opt = el.getAttribute(prefix + "-html");
                var expressFunc = parseSodaExpression(opt, scope);

                if (expressFunc) {
                    el.innerHTML = expressFunc;

                    return {
                        command: "childDone"
                    };
                }
            }
        };
    });

    sodaDirective("style", function () {
        return {
            link: function (scope, el, attrs) {
                var opt = el.getAttribute(prefix + "-style");
                var expressFunc = parseSodaExpression(opt, scope);

                var getCssValue = function (name, value) {
                    var numberWithoutpx = /opacity|z-index/;
                    if (numberWithoutpx.test(name)) {
                        return parseFloat(value);
                    }

                    if (isNaN(value)) {
                        return value;
                    } else {
                        return value + "px";
                    }
                };

                if (expressFunc) {
                    var stylelist = [];

                    for (var i in expressFunc) {
                        if (expressFunc.hasOwnProperty(i)) {
                            var provalue = getCssValue(i, expressFunc[i]);

                            stylelist.push([i, provalue].join(":"));
                        }
                    }

                    var style = el.style;
                    for (var i = 0; i < style.length; i++) {
                        var name = style[i];
                        if (expressFunc[name]) {
                        } else {
                            stylelist.push([name, style[name]].join(":"));
                        }
                    }

                    var styleStr = stylelist.join(";");

                    el.setAttribute("style", styleStr);
                }
            }
        };
    });

    var sodaRender = function (str, data) {
        // ��directive��������
        sodaDirectiveArr.sort(function (b, a) {
            return (Number(a.opt.priority || 0) - Number(b.opt.priority || 0));
        });

        //console.log(sodaDirectiveArr);

        // ����ģ��DOM
        var div = document.createElement("div");

        div.innerHTML = str;

        [].map.call([].slice.call(div.childNodes, []), function (child) {
            compileNode(child, data);
        });

        return div.innerHTML;

        //  var frament = document.createDocumentFragment();
        //  frament.innerHTML = div.innerHTML;

        /*
         frament.update = function(newData){
         //checkingDirtyData(data, d);
         var diff = DeepDiff.noConflict();

         var diffResult = diff(data, newData);

         console.log(diffResult);

         var dirtyData = ['a'];

         for(var i = 0; i < dirtyData.length; i ++){
         var item = dirtyData[i];

         var id = hashTable.expression2id[item];

         var nowValue = parseSodaExpression(item, newData);
         //console.log(nowValue);

         if(id.el){
         id.el.nodeValue = nowValue;
         }
         }

         console.log(hashTable);


         };
         */

        var child;
        while (child = div.childNodes[0]) {
            frament.appendChild(child);
        }


        return frament;
    };

    var eventPool = {};
    sodaRender.addEventListener = function (type, func) {
        if (eventPool[type]) {
        } else {
            eventPool[type] = [];
        }

        eventPool[type].push(func);
    };

    var triggerEvent = function (type, e, data) {
        var events = eventPool[type] || [];

        for (var i = 0; i < events.length; i++) {
            var eventFunc = events[i];
            eventFunc && eventFunc(e, data);
        }
    };

    sodaRender.filter = sodaFilter;

    sodaRender.prefix = function (newPrefix) {


        for(var key in sodaDirectiveMap){
            if(sodaDirectiveMap.hasOwnProperty(key)){
                sodaDirectiveMap[key.replace(prefix,newPrefix)] = sodaDirectiveMap[key];
                delete sodaDirectiveMap[key];
            }
        }

        var i = 0,
            len = sodaDirectiveArr.length;
        for(;i<len;i++) {
            sodaDirectiveArr[i].name = sodaDirectiveArr[i].name.replace(prefix, newPrefix);
        }

        prefix = newPrefix
        prefixReg = new RegExp('^' + prefix + '-')
    }

    if (typeof exports === 'object' && typeof module === 'object')
        module.exports = sodaRender;
    else if (typeof define === 'function' && define.amd)
        define([], function () {
            return sodaRender;
        });
    else if (typeof exports === 'object')
        exports["soda"] = sodaRender;
    else
        window.soda = sodaRender;

    // ���������쳣���
})();