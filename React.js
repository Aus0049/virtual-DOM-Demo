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
    // 创建自定义组件对象
    createClass:function(spec){
        //生成一个子类
        var Constructor = function (props) {
            this.props = props;
            this.state = this.getInitialState ? this.getInitialState() : null;
        }
        //原型继承，继承超级父类
        Constructor.prototype = new ReactClass();
        Constructor.prototype.constructor = Constructor;
        //混入spec到原型
        $.extend(Constructor.prototype, spec);
        return Constructor;
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

//定义ReactClass类,所有自定义的超级父类
var ReactClass = function(){};
//留给子类去继承覆盖
ReactClass.prototype.render = function(){};

//setState
ReactClass.prototype.setState = function(newState) {
    //还记得我们在ReactCompositeComponent里面mount的时候 做了赋值
    //所以这里可以拿到 对应的ReactCompositeComponent的实例_reactInternalInstance
    this._reactInternalInstance.receiveComponent(null, newState);
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
    //自定义的元素节点
    if(typeof node === 'object' && typeof node.type === 'function'){
        //注意这里，使用新的component,专门针对自定义元素
        return new ReactCompositeComponent(node);

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

// component类，处理自定义组件
function ReactCompositeComponent(element){
    //存放元素element对象
    this._currentElement = element;
    //存放唯一标识
    this._rootNodeID = null;
    //存放对应的ReactClass的实例
    this._instance = null;
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

//用于返回当前自定义元素渲染时应该返回的内容
ReactCompositeComponent.prototype.mountComponent = function(rootID){
    this._rootNodeID = rootID;
    //拿到当前元素对应的属性值
    var publicProps = this._currentElement.props;
    //拿到对应的ReactClass
    var ReactClass = this._currentElement.type;
    // Initialize the public class
    var inst = new ReactClass(publicProps);
    this._instance = inst;
    //保留对当前comonent的引用，下面更新会用到
    inst._reactInternalInstance = this;

    if (inst.componentWillMount) {
        inst.componentWillMount();
        //这里在原始的reactjs其实还有一层处理，就是  componentWillMount调用setstate，不会触发rerender而是自动提前合并，这里为了保持简单，就略去了
    }
    //调用ReactClass的实例的render方法,返回一个element或者一个文本节点
    var renderedElement = this._instance.render();
    //得到renderedElement对应的component类实例
    var renderedComponentInstance = instantiateReactComponent(renderedElement);
    this._renderedComponent = renderedComponentInstance; //存起来留作后用

    //拿到渲染之后的字符串内容，将当前的_rootNodeID传给render出的节点
    var renderedMarkup = renderedComponentInstance.mountComponent(this._rootNodeID);

    //之前我们在React.render方法最后触发了mountReady事件，所以这里可以监听，在渲染完成后会触发。
    $(document).on('mountReady', function() {
        //调用inst.componentDidMount
        inst.componentDidMount && inst.componentDidMount();
    });

    return renderedMarkup;
}

//更新
ReactCompositeComponent.prototype.receiveComponent = function(nextElement, newState) {

    //如果接受了新的，就使用最新的element
    this._currentElement = nextElement || this._currentElement

    var inst = this._instance;
    //合并state
    var nextState = $.extend(inst.state, newState);
    var nextProps = this._currentElement.props;

    //改写state
    inst.state = nextState;

    //如果inst有shouldComponentUpdate并且返回false。说明组件本身判断不要更新，就直接返回。
    if (inst.shouldComponentUpdate && (inst.shouldComponentUpdate(nextProps, nextState) === false)) return;

    //生命周期管理，如果有componentWillUpdate，就调用，表示开始要更新了。
    if (inst.componentWillUpdate) inst.componentWillUpdate(nextProps, nextState);


    var prevComponentInstance = this._renderedComponent;
    var prevRenderedElement = prevComponentInstance._currentElement;
    //重新执行render拿到对应的新element;
    var nextRenderedElement = this._instance.render();


    //判断是需要更新还是直接就重新渲染
    //注意这里的_shouldUpdateReactComponent跟上面的不同哦 这个是全局的方法
    if (_shouldUpdateReactComponent(prevRenderedElement, nextRenderedElement)) {
        //如果需要更新，就继续调用子节点的receiveComponent的方法，传入新的element更新子节点。
        prevComponentInstance.receiveComponent(nextRenderedElement);
        //调用componentDidUpdate表示更新完成了
        inst.componentDidUpdate && inst.componentDidUpdate();

    } else {
        //如果发现完全是不同的两种element，那就干脆重新渲染了
        var thisID = this._rootNodeID;
        //重新new一个对应的component，
        this._renderedComponent = this._instantiateReactComponent(nextRenderedElement);
        //重新生成对应的元素内容
        var nextMarkup = _renderedComponent.mountComponent(thisID);
        //替换整个节点
        $('[data-reactid="' + this._rootNodeID + '"]').replaceWith(nextMarkup);

    }

}

//用来判定两个element需不需要更新
//这里的key是我们createElement的时候可以选择性的传入的。用来标识这个element，当发现key不同时，我们就可以直接重新渲染，不需要去更新了。
var _shouldUpdateReactComponent ＝ function(prevElement, nextElement){
    if (prevElement != null && nextElement != null) {
    var prevType = typeof prevElement;
    var nextType = typeof nextElement;
    if (prevType === 'string' || prevType === 'number') {
      return nextType === 'string' || nextType === 'number';
    } else {
      return nextType === 'object' && prevElement.type === nextElement.type && prevElement.key === nextElement.key;
    }
  }
  return false;
}

ReactDOMTextComponent.prototype.receiveComponent = function(nextText) {
    var nextStringText = '' + nextText;
    //跟以前保存的字符串比较
    if (nextStringText !== this._currentElement) {
        this._currentElement = nextStringText;
        //替换整个节点
        $('[data-reactid="' + this._rootNodeID + '"]').html(this._currentElement);

    }
}

ReactDOMComponent.prototype.receiveComponent = function(nextElement) {
    var lastProps = this._currentElement.props;
    var nextProps = nextElement.props;

    this._currentElement = nextElement;
    //需要单独的更新属性
    this._updateDOMProperties(lastProps, nextProps);
    //再更新子节点
    this._updateDOMChildren(nextElement.props.children);
}

ReactDOMComponent.prototype._updateDOMProperties = function(lastProps, nextProps) {
    var propKey;
    //遍历，当一个老的属性不在新的属性集合里时，需要删除掉。

    for (propKey in lastProps) {
        //新的属性里有，或者propKey是在原型上的直接跳过。这样剩下的都是不在新属性集合里的。需要删除
        if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
            continue;
        }
        //对于那种特殊的，比如这里的事件监听的属性我们需要去掉监听
        if (/^on[A-Za-z]/.test(propKey)) {
            var eventType = propKey.replace('on', '');
            //针对当前的节点取消事件代理
            $(document).undelegate('[data-reactid="' + this._rootNodeID + '"]', eventType, lastProps[propKey]);
            continue;
        }

        //从dom上删除不需要的属性
        $('[data-reactid="' + this._rootNodeID + '"]').removeAttr(propKey)
    }

    //对于新的属性，需要写到dom节点上
    for (propKey in nextProps) {
        //对于事件监听的属性我们需要特殊处理
        if (/^on[A-Za-z]/.test(propKey)) {
            var eventType = propKey.replace('on', '');
            //以前如果已经有，说明有了监听，需要先去掉
            lastProps[propKey] && $(document).undelegate('[data-reactid="' + this._rootNodeID + '"]', eventType, lastProps[propKey]);
            //针对当前的节点添加事件代理,以_rootNodeID为命名空间
            $(document).delegate('[data-reactid="' + this._rootNodeID + '"]', eventType + '.' + this._rootNodeID, nextProps[propKey]);
            continue;
        }

        if (propKey == 'children') continue;

        //添加新的属性，或者是更新老的同名属性
        $('[data-reactid="' + this._rootNodeID + '"]').prop(propKey, nextProps[propKey])
    }

}

ReactDOMComponent.prototype.receiveComponent = function(nextElement){
    var lastProps = this._currentElement.props;
    var nextProps = nextElement.props;

    this._currentElement = nextElement;
    //需要单独的更新属性
    this._updateDOMProperties(lastProps,nextProps);
    //再更新子节点
    this._updateDOMChildren(nextProps.children);
}

//全局的更新深度标识
var updateDepth = 0;
//全局的更新队列，所有的差异都存在这里
var diffQueue = [];

ReactDOMComponent.prototype._updateDOMChildren = function(nextChildrenElements){
    updateDepth++
    //_diff用来递归找出差别,组装差异对象,添加到更新队列diffQueue。
    this._diff(diffQueue,nextChildrenElements);
    updateDepth--
    if(updateDepth == 0){
        //在需要的时候调用patch，执行具体的dom操作
        this._patch(diffQueue);
        diffQueue = [];
    }
}

