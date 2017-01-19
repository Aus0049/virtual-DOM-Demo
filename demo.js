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
    // 对应的ReactCompositeComponent的实例_reactInternalInstance
    // 所有的挂载，更新都应该交给对应的component来管理。
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

// 文本节点的更新 
ReactDOMTextComponent.prototype.receiveComponent = function(nextText) {
    var nextStringText = '' + nextText;
    //跟以前保存的字符串比较
    if (nextStringText !== this._currentElement) {
        this._currentElement = nextStringText;
        //替换整个节点
        $('[data-reactid="' + this._rootNodeID + '"]').html(this._currentElement);

    }
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

// 原生节点更新方法
ReactDOMComponent.prototype.receiveComponent = function(nextElement) {
    var lastProps = this._currentElement.props;
    var nextProps = nextElement.props;

    this._currentElement = nextElement;
    // 需要单独的更新属性
    this._updateDOMProperties(lastProps, nextProps);
    // 再更新子节点
    this._updateDOMChildren(nextElement.props.children);
}

// 更新属性
ReactDOMComponent.prototype._updateDOMProperties = function(lastProps, nextProps) {
    var propKey;
    // 遍历，当一个老的属性不在新的属性集合里时，需要删除掉。
    for (propKey in lastProps) {
        // 新的属性里有，或者propKey是在原型上的直接跳过。这样剩下的都是不在新属性集合里的。需要删除
        if (nextProps.hasOwnProperty(propKey) || !lastProps.hasOwnProperty(propKey)) {
            // 跳出当前循环 下一个
            continue;
        }
        //对于那种特殊的，比如这里的事件监听的属性我们需要去掉监听
        if (/^on[A-Za-z]/.test(propKey)) {
            var eventType = propKey.replace('on', '');
            //针对当前的节点取消事件代理
            $(document).undelegate('[data-reactid="' + this._rootNodeID + '"]', eventType, lastProps[propKey]);
            continue;
        }

        // 从dom上删除不需要的属性
        $('[data-reactid="' + this._rootNodeID + '"]').removeAttr(propKey)
    }

    // 对于新的属性，需要写到dom节点上
    for (propKey in nextProps) {
        // 对于事件监听的属性我们需要特殊处理
        if (/^on[A-Za-z]/.test(propKey)) {
            var eventType = propKey.replace('on', '');
            //以前如果已经有，说明有了监听，需要先去掉
            lastProps[propKey] && $(document).undelegate('[data-reactid="' + this._rootNodeID + '"]', eventType, lastProps[propKey]);
            // 针对当前的节点添加事件代理,以_rootNodeID为命名空间
            $(document).delegate('[data-reactid="' + this._rootNodeID + '"]', eventType + '.' + this._rootNodeID, nextProps[propKey]);
            continue;
        }

        if (propKey == 'children') continue;

        // 添加新的属性，或者是更新老的同名属性
        $('[data-reactid="' + this._rootNodeID + '"]').prop(propKey, nextProps[propKey])
    }
}

// 全局的更新深度标识
var updateDepth = 0;
// 全局的更新队列，所有的差异都存在这里
var diffQueue = [];

// 原生节点更新子节点
ReactDOMComponent.prototype._updateDOMChildren = function(nextChildrenElements){
    updateDepth++;
    // _diff用来递归找出差别,组装差异对象,添加到更新队列diffQueue。
    this._diff(diffQueue, nextChildrenElements);
    updateDepth--;
    if(updateDepth == 0){
        //在需要的时候调用patch，执行具体的dom操作
        this._patch(diffQueue);
        diffQueue = [];
    }
}

// _diff用来递归找出差别,组装差异对象,添加到更新队列diffQueue。
ReactDOMComponent.prototype._diff = function(diffQueue, nextChildrenElements) {
  var self = this;
  // 拿到之前的子节点的 component类型对象的集合,这个是在刚开始渲染时赋值的，记不得的可以翻上面
  // _renderedChildren 本来是数组，我们搞成map
  var prevChildren = flattenChildren(self._renderedChildren);
  // 生成新的子节点的component对象集合，这里注意，会复用老的component对象
  var nextChildren = generateComponentChildren(prevChildren, nextChildrenElements);
  //重新赋值_renderedChildren，使用最新的。
  self._renderedChildren = []
  $.each(nextChildren, function(key, instance) {
    self._renderedChildren.push(instance);
  })


  var nextIndex = 0; //代表到达的新的节点的index
  //通过对比两个集合的差异，组装差异节点添加到队列中
  for (name in nextChildren) {
    if (!nextChildren.hasOwnProperty(name)) {
      continue;
    }
    var prevChild = prevChildren && prevChildren[name];
    var nextChild = nextChildren[name];
    // 相同的话，说明是使用的同一个component,所以我们需要做移动的操作
    if (prevChild === nextChild) {
      // 添加差异对象，类型：MOVE_EXISTING
      diffQueue.push({
        parentId: self._rootNodeID,
        parentNode: $('[data-reactid=' + self._rootNodeID + ']'),
        type: UPATE_TYPES.MOVE_EXISTING,
        fromIndex: prevChild._mountIndex,
        toIndex: nextIndex
      })
    } else { // 如果不相同，说明是新增加的节点
      // 但是如果老的还存在，就是element不同，但是component一样。我们需要把它对应的老的element删除。
      if (prevChild) {
        // 添加差异对象，类型：REMOVE_NODE
        diffQueue.push({
          parentId: self._rootNodeID,
          parentNode: $('[data-reactid=' + self._rootNodeID + ']'),
          type: UPATE_TYPES.REMOVE_NODE,
          fromIndex: prevChild._mountIndex,
          toIndex: null
        })

        // 如果以前已经渲染过了，记得先去掉以前所有的事件监听，通过命名空间全部清空
        if (prevChild._rootNodeID) {
            $(document).undelegate('.' + prevChild._rootNodeID);
        }

      }
      // 新增加的节点，也组装差异对象放到队列里
      // 添加差异对象，类型：INSERT_MARKUP
      diffQueue.push({
        parentId: self._rootNodeID,
        parentNode: $('[data-reactid=' + self._rootNodeID + ']'),
        type: UPATE_TYPES.INSERT_MARKUP,
        fromIndex: null,
        toIndex: nextIndex,
        markup: nextChild.mountComponent() //新增的节点，多一个此属性，表示新节点的dom内容
      })
    }
    // 更新mount的index
    nextChild._mountIndex = nextIndex;
    nextIndex++;
  }



  // 对于老的节点里有，新的节点里没有的那些，也全都删除掉
  for (name in prevChildren) {
    if (prevChildren.hasOwnProperty(name) && !(nextChildren && nextChildren.hasOwnProperty(name))) {
      // 添加差异对象，类型：REMOVE_NODE
      diffQueue.push({
        parentId: self._rootNodeID,
        parentNode: $('[data-reactid=' + self._rootNodeID + ']'),
        type: UPATE_TYPES.REMOVE_NODE,
        fromIndex: prevChild._mountIndex,
        toIndex: null
      })
      // 如果以前已经渲染过了，记得先去掉以前所有的事件监听
      if (prevChildren[name]._rootNodeID) {
        $(document).undelegate('.' + prevChildren[name]._rootNodeID);
      }
    }
  }
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
    // 为了调用setState时候使用
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

// 自定义元素的更新
ReactCompositeComponent.prototype.receiveComponent = function (nextElement, newState) {
    //如果接受了新的，就使用最新的element
    this._currentElement = nextElement || this._currentElement;

    var inst = this._instance;
    // 合并state
    var nextState = $.extend(inst.state, newState);
    var nextProps = this._currentElement.props;

    // 改写state
    inst.state = nextState;

    // 如果inst有shouldComponentUpdate并且返回false。说明组件本身判断不要更新，就直接返回。
    if (inst.shouldComponentUpdate && (inst.shouldComponentUpdate(nextProps, nextState) === false)) return;

    // 生命周期管理，如果有componentWillUpdate，就调用，表示开始要更新了。
    if (inst.componentWillUpdate) inst.componentWillUpdate(nextProps, nextState);

    // 初次渲染时候生成的element
    var prevComponentInstance = this._renderedComponent;
    var prevRenderedElement = prevComponentInstance._currentElement;
    // 重新执行render拿到对应的新element;
    var nextRenderedElement = this._instance.render();

    // 判断是需要更新还是直接就重新渲染
    // 注意这里的_shouldUpdateReactComponent跟上面的不同哦 这个是全局的方法
    if (_shouldUpdateReactComponent(prevRenderedElement, nextRenderedElement)) {
        // 如果需要更新，就继续递归调用子节点的receiveComponent的方法，传入新的element更新子节点。
        prevComponentInstance.receiveComponent(nextRenderedElement);
        // 调用componentDidUpdate表示更新完成了
        inst.componentDidUpdate && inst.componentDidUpdate();
    } else {
        // 如果发现完全是不同的两种element，那就干脆重新渲染了
        var thisID = this._rootNodeID;
        // 重新new一个对应的component，
        this._renderedComponent = this._instantiateReactComponent(nextRenderedElement);
        // 重新生成对应的元素内容
        var nextMarkup = _renderedComponent.mountComponent(thisID);
        // 替换整个节点
        $('[data-reactid="' + this._rootNodeID + '"]').replaceWith(nextMarkup);
    }

}

// 全局方法 用来判定两个element需不需要更新
// 这里的key是我们createElement的时候可以选择性的传入的。用来标识这个element。
// 当发现key不同时，我们就可以直接重新渲染，不需要去更新了。
var _shouldUpdateReactComponent ＝ function(prevElement, nextElement){
    if (prevElement != null && nextElement != null) {
        var prevType = typeof prevElement;
        var nextType = typeof nextElement;
        // 文本节点时
        if (prevType === 'string' || prevType === 'number') {
          return nextType === 'string' || nextType === 'number';
        } else {
          return nextType === 'object' && prevElement.type === nextElement.type && prevElement.key === nextElement.key;
        }
    }
    return false;
}

// 差异更新的几种类型
var UPATE_TYPES = {
    MOVE_EXISTING: 1, // 
    REMOVE_NODE: 2, //
    INSERT_MARKUP: 3 //
}

// 普通的children是一个数组，此方法把它转换成一个map,key就是element的key,如果是text节点或者element创建时并没有传入key,就直接用在数组里的index标识
function flattenChildren(componentChildren) {
    var child;
    var name;
    var childrenMap = {};
    for (var i = 0; i < componentChildren.length; i++) {
        child = componentChildren[i];
        name = child && child._currentelement && child._currentelement.key ? child._currentelement.key : i.toString(36);
        childrenMap[name] = child;
    }
    return childrenMap;
}

// 主要用来生成子节点elements的component集合
// 这边注意，有个判断逻辑，如果发现是更新，就会继续使用以前的componentInstance,调用对应的receiveComponent。
// 如果是新的节点，就会重新生成一个新的componentInstance，
function generateComponentChildren(prevChildren, nextChildrenElements) {
    var nextChildren = {};
    nextChildrenElements = nextChildrenElements || [];
    $.each(nextChildrenElements, function(index, element) {
        var name = element.key ? element.key : index;
        var prevChild = prevChildren && prevChildren[name];
        var prevElement = prevChild && prevChild._currentElement;
        var nextElement = element;

        // 调用_shouldUpdateReactComponent判断是否是更新
        if (_shouldUpdateReactComponent(prevElement, nextElement)) {
            // 更新的话直接递归调用子节点的receiveComponent就好了
            prevChild.receiveComponent(nextElement);
            // 然后继续使用老的component
            nextChildren[name] = prevChild;
        } else {
            // 对于没有老的，那就重新新增一个，重新生成一个component
            var nextChildInstance = instantiateReactComponent(nextElement, null);
            // 使用新的component
            nextChildren[name] = nextChildInstance;
        }
    })

    return nextChildren;
}

