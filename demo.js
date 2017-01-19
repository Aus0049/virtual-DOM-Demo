// Reacrt 对象
// react 核心就是虚拟DOM树 和 diff算法
// 这里为了方便理解 只处理基本流程 其他扩展情况暂时不考虑 有兴趣看源码
// 方便理解 这里管虚拟DOM节点统一叫 element 
// 管真实DOM统一叫 node
React = {
    // react 节点的索引 相当于节点在react中的id 为了计算diff时候方便
    nextReactRootIndex: 0,
    // 创建节点的方法  相当于是同一个标准化输入输出的过程 
    // 把想要创建节点的参数传进来 返回一个虚拟DOM
    createElement: function (type, config, children) {
        var props = {}, // 外部传进来的参数
            propName; // 参数名称
        // 初始化参数 防止参数传入为空时 后续取值报错
        config = config || {};
        // 参数里如果指定了key 就用指定的 没有的话 null
        var key = config.key || null;
        // 将config里的内容转到props中
        for(propName in config){
            if(config.hasOwnProperty(propName) && propName !== 'key'){
                props[propName] = config[propName];
            }
        }

        // 处理children 将其全部挂载到props中的children属性上
        // children属性是个数组 规范化赋值
        var childrenLength = arguments.length - 2; //去除type和config参数 剩下的都是children
        if(childrenLength === 1){
            props.children = $.isArray(children) ? children : [children];
        } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for(var i = 0; i < childrenLength; i++){
                childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
        }
        // 输出一个虚拟DOM节点对象
        return new ReactElment(type, key, props);
    },
    // 创建自定义组件对象 
    // 传入的参数就是使用时定义的更重生命周期函数和render等
    createClass: function(spec){
        // 生成一个子类
        var Constructor = function (props) {
            // 处理初始化props 和 state
            this.props = this.getDefaultProps ? this.getDefaultProps() : props;
            this.state = this.getInitialState ? this.getInitialState() : null;
        }
        // 原型继承 集成超级父类
        Constructor.prototype = new ReactClass();
        Constructor.prototype.constructor = Constructor;
        // 混入spec到原型
        $.extend(Constructor.prototype, spec);
        return Constructor;
    },
    // render 方法
    render: function(element, container){
        // 就是页面最下方的React.render(<Elemnet />, "container");
        // 输入的element为虚拟DOM container为挂载的容器
        // 将输入的虚拟DOM转成真实DOM 并完成事件绑定等 
        var compontInstance = instantiateReactComponent(element);
        // 
        var markup = compontInstance.mountComponent(React.nextReactRootIndex++);
        // 挂载真实DOM
        $(container).html(markup);
        // 触发完成 mount事件
        $(document).tirgger('mountReady');
    }
};

// 定义ReactClass类,所有自定义的超级父类
var ReactClass = function(){};
// 留给子类去继承覆盖
ReactClass.prototype.render = function(){};

//setState
ReactClass.prototype.setState = function(newState) {
    //还记得我们在ReactCompositeComponent里面mount的时候 做了赋值
    //所以这里可以拿到 对应的ReactCompositeComponent的实例_reactInternalInstance
    this._reactInternalInstance.receiveComponent(null, newState);
};

// component工厂 传入一个虚拟DOM节点对象 根据参数分类 输出节点对象对应的处理对象
function instantiateReactComponent (element) {
    // 文本节点
    if(typeof element === 'string' || typeof element === 'number'){
        return new ReactDOMTextComponent(element)
    }
    // 浏览器默认节点的情况 如 div span 等
    if(typeof element === 'object' && typeof element.type === 'string'){
        // 注意这里，使用了一种新的component
        return new ReactDOMComponent(element);
    }
    //自定义的元素节点
    if(typeof element === 'object' && typeof element.type === 'function'){
        //注意这里，使用新的component,专门针对自定义元素
        return new ReactCompositeComponent(element);
    }
} 

// ReactElement就是虚拟dom的概念，具有一个type属性代表当前的节点类型，还有节点的属性props
// 比如对于div这样的节点type就是div，props就是那些attributes
// 另外这里的key, 可以用来标识这个element
function ReactElement(type,key,props){
  this.type = type;
  this.key = key;
  this.props = props;
}

// component类，处理存文本 生成span节点 
function ReactDOMTextComponent(text) {
    //存下当前的字符串
    this._currentElement = '' + text;
    //用来标识当前component
    this._rootNodeID = null;
}

// 向文本节点的component类原型上添加挂在组件的方法 
// 接收一个id 输出一个带id的真实DOM
ReactDOMTextComponent.prototype.mountComponent = function(rootID) {
    this._rootNodeID = rootID;
    return '<span data-reactid="' + rootID + '">' + this._currentElement + '</span>';
}

// component类，处理浏览器自带元素 如div等 这里有很多情况
// 如ul li select 等元素暂不考虑 考虑一般情况做demo
function ReactDOMComponent(element) {
    //存下当前的字符串
    this._currentElement = element;
    //用来标识当前component
    this._rootNodeID = null;
}

// 向原生节点的component类原型上添加挂在组件的方法
// 输入一个id 返回带id的真实DOM
ReactDOMComponent.prototype.mountComponent = function(rootID) {
    this._rootNodeID = rootID;
    // 加载器参数props
    var props = this._currentElement.props;
    // 处理开标签 
    var tagOpen = '<' + this._currentElement.type;
    // 处理闭标签
    var tagClose = '</' + this._currentElement.type + '>'; 
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
        // 如果属性是className的话 转成class
        if("className" === propKey){
            props['class'] = props[propKey];
        }

        // 对于children属性以及事件监听的属性不需要进行字符串拼接
        // 事件会代理到全局。这边不能拼到dom上不然会产生原生的事件监听
        if (props[propKey] && propKey != 'children' && !/^on[A-Za-z]/.test(propKey)) {
            console.log(typeof props[propKey]);
            tagOpen += ' ' + propKey + '=' + props[propKey];
        }
    }

    // 获取子节点渲染出的内容
    var content = '';
    var children = props.children || [];

    var childrenInstances = []; // 用于保存所有的子节点的componet实例，以后会用到

    var that = this;

    $.each(children, function(key, child) {
        // 这里再次调用了instantiateReactComponent实例化子节点component类，拼接好返回
        var childComponentInstance = instantiateReactComponent(child);
        childComponentInstance._mountIndex = key;

        childrenInstances.push(childComponentInstance);
        // 子节点的rootId是父节点的rootId加上新的key也就是顺序的值拼成的新值
        var curRootId = that._rootNodeID + '.' + key;
        // 得到子节点的渲染内容
        var childMarkup = childComponentInstance.mountComponent(curRootId);
        // 拼接在一起
        content += ' ' + childMarkup;
    })

    //留给以后更新时用的这边先不用管
    this._renderedChildren = childrenInstances;

    //拼出整个html内容
    return tagOpen + '>' + content + tagClose;
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

// 向自定义节点的原型上添加挂在组件的方法
// 输入一个id 返回带id的真实DOM
ReactCompositeComponent.prototype.mountComponent = function(rootID) {
    this._rootNodeID = rootID;
    // 拿到当前元素对应的属性值
    var publicProps = this._currentElement.props;
    // 拿到对应的ReactClass
    var ReactClass = this._currentElement.type;
    // Initialize the public class
    var inst = new ReactClass(publicProps);
    this._instance = inst;
    // 保留对当前comonent的引用，下面更新会用到
    inst._reactInternalInstance = this;

    if (inst.componentWillMount) {
        inst.componentWillMount();
        // 这里在原始的reactjs其实还有一层处理，就是  componentWillMount调用setstate，不会触发rerender而是自动提前合并，这里为了保持简单，就略去了
    }
    // 调用ReactClass的实例的render方法,返回一个element或者一个文本节点
    var renderedElement = this._instance.render();
    // 得到renderedElement对应的component类实例
    var renderedComponentInstance = instantiateReactComponent(renderedElement);
    //存起来留作后用
    this._renderedComponent = renderedComponentInstance; 
    //拿到渲染之后的字符串内容，将当前的_rootNodeID传给render出的节点
    var renderedMarkup = renderedComponentInstance.mountComponent(this._rootNodeID);

    //之前我们在React.render方法最后触发了mountReady事件，所以这里可以监听，在渲染完成后会触发。
    $(document).on('mountReady', function() {
        //调用inst.componentDidMount
        inst.componentDidMount && inst.componentDidMount();
    });

    return renderedMarkup;
}

