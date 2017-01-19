// Reacrt 对象
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