React = {
    // react 节点的索引值 
    nextReactRootIndex:0,
    // 创建节点的方法
    createElement: function (type,config,children) {
        var props = {}, // 外部传进来的参数
            propName; // 参数名称
        config = config || {}; // 初始化参数
        var key = config.key || null; 

        //复制config里的内容到props
        for (propName in config) {
            if (config.hasOwnProperty(propName) && propName !== 'key') {
                props[propName] = config[propName];
            }
        }

        //处理children,全部挂载到props的children属性上 ？？？ 为什么不创造一个children属性而是挂载到props上
        //支持两种写法，如果只有一个参数，直接赋值给children，否则做合并处理
        var childrenLength = arguments.length - 2; // 去除type和config
        if (childrenLength === 1) {
            props.children = $.isArray(children) ? children : [children] ;
        } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
                childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
        }

        return new ReactElement(type, key, props);
    },
    // render方法
    render:function(element,container){
        var componentInstance = instantiateReactComponent(element);
        var markup = componentInstance.mountComponent(React.nextReactRootIndex++);
        $(container).html(markup);
        //触发完成mount的事件
        $(document).trigger('mountReady');    
    }
}

//component工厂  用来返回一个component实例 这里可以处理各种类型的component
function instantiateReactComponent(node){
    // 文本节点的情况
    if(typeof node === 'string' || typeof node === 'number'){
        return new ReactDOMTextComponent(node)
    }
    // 浏览器默认节点的情况 如 div span 等
    if(typeof node === 'object' && typeof node.type === 'string'){
        // 注意这里，使用了一种新的component
        return new ReactDOMComponent(node);

    }
}

//component类，处理存文本 生成span节点
function ReactDOMTextComponent(text) {
    //存下当前的字符串
    this._currentElement = '' + text;
    //用来标识当前component
    this._rootNodeID = null;
}

//component类，处理浏览器自带元素
function ReactDOMComponent(element) {
    //存下当前的字符串
    this._currentElement = element;
    //用来标识当前component
    this._rootNodeID = null;
}

//ReactElement就是虚拟dom的概念，具有一个type属性代表当前的节点类型，还有节点的属性props
//比如对于div这样的节点type就是div，props就是那些attributes
//另外这里的key, 可以用来标识这个element
function ReactElement(type,key,props){
  this.type = type;
  this.key = key;
  this.props = props;
}

//component渲染时生成的dom结构
ReactDOMTextComponent.prototype.mountComponent = function(rootID) {
    this._rootNodeID = rootID;
    return '<span data-reactid="' + rootID + '">' + this._currentElement + '</span>';
}

//component渲染时生成的dom结构
ReactDOMComponent.prototype.mountComponent = function(rootID) {
    this._rootNodeID = rootID;
    var props = this._currentElement.props; // 加载器参数props
    var tagOpen = '<' + this._currentElement.type // 处理开标签
    var tagClose = '</' + this._currentElement.type + '>'; // 处理闭标签

    //加上reactid标识
    tagOpen += ' data-reactid=' + this._rootNodeID;

    //拼凑出属性
    for (var propKey in props) {

        //这里要做一下事件的监听，就是从属性props里面解析拿出on开头的事件属性的对应事件监听
        if (/^on[A-Za-z]/.test(propKey)) {
            var eventType = propKey.replace('on', '');
            //针对当前的节点添加事件代理,以_rootNodeID为命名空间
            $(document).delegate('[data-reactid="' + this._rootNodeID + '"]', eventType + '.' + this._rootNodeID, props[propKey]);
        }

        // 如果属性是style的话 转成字符串
        if("style" === propKey){
            let styleStr = "";
            for(var styleKey in props[propKey]){
                // 处理驼峰属性转 -
                var commonKey = styleKey.replace( /[A-Z]/, function($){
                    return "-" + $.toLowerCase();
                });
                styleStr += commonKey + ":" + props[propKey][styleKey] + ";";
            }
            props[propKey] = styleStr;
        }

        //对于children属性以及事件监听的属性不需要进行字符串拼接
        //事件会代理到全局。这边不能拼到dom上不然会产生原生的事件监听
        if (props[propKey] && propKey != 'children' && !/^on[A-Za-z]/.test(propKey)) {
            console.log(typeof props[propKey]);
            tagOpen += ' ' + propKey + '=' + props[propKey];
        }
    }

    //获取子节点渲染出的内容
    var content = '';
    var children = props.children || [];

    var childrenInstances = []; //用于保存所有的子节点的componet实例，以后会用到

    var that = this;

    $.each(children, function(key, child) {
        //这里再次调用了instantiateReactComponent实例化子节点component类，拼接好返回
        var childComponentInstance = instantiateReactComponent(child);
        childComponentInstance._mountIndex = key;

        childrenInstances.push(childComponentInstance);
        //子节点的rootId是父节点的rootId加上新的key也就是顺序的值拼成的新值
        var curRootId = that._rootNodeID + '.' + key;
        //得到子节点的渲染内容
        var childMarkup = childComponentInstance.mountComponent(curRootId);
        //拼接在一起
        content += ' ' + childMarkup;
    })

    //留给以后更新时用的这边先不用管
    this._renderedChildren = childrenInstances;

    //拼出整个html内容
    return tagOpen + '>' + content + tagClose;
}

