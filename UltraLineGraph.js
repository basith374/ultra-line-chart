import React, {Component} from 'react';
import * as d3 from 'd3';
import ReactDOM from 'react-dom';
import moment from 'moment';
import './ultralinegraph.css';

function getMaxY(config) {
    let data = config.data;
    let maxY = 0;
    for(let d in data) {
        data[d].points.sort((a, b) => a.date - b.date);
        let numbers = data[d].points.map(p => p.value);
        maxY = Math.max(maxY, Math.max.apply(null, numbers));
    }
    return Math.max(maxY, config.maxY || 0);
}

function getX(config) {
    let {width,data} = config;
    let x = d3.scaleTime()
        .range([0, width])
    if(data.length) x.domain(d3.extent(data[0].points, d => d.date));
    if(config.xDomain) x.domain(config.xDomain);
    return x;
}

function drawLineChart(el, config) {
    let data = config.data;
    data.sort((a, b) => b.points.length - a.points.length);

    let maxY = getMaxY(config);

    let height = config.height;
    let width = config.width;
    let margin = config.margin;

    /* init */
    var svg = d3.select(el).select('svg');
    svg.attr('height', height + margin.top + margin.bottom);
    svg.attr('width', width + margin.left + margin.right);
    let g = svg.select('g.ulg-g');

    /* define axis & line */
    var x = getX(config);
    let getXAxis = () => d3.axisBottom(x).ticks(7);

    var y = d3.scaleLinear()
        .rangeRound([height, 0])
        .domain([0, maxY]);
    let getYAxis = () => d3.axisLeft(y).ticks(5);

    /* draw gridlines */
    g.select('g.grid.y')
        // .transition()
        .call(getYAxis().tickSize(-width).tickFormat(''));

    g.select('g.grid.x')
        .attr("transform", "translate(0," + height + ")")
        // .transition()
        .call(getXAxis().tickSize(-height).tickFormat(''));

    /* draw axis */
    g.select('g.axis.x')
        .attr('transform', 'translate(0, ' + height + ')')
        // .transition()
        .call(getXAxis());
    
    g.select('g.axis.y')
        // .transition()
        .call(getYAxis());

    /* draw path */
    var line = d3.line()
        .curve(d3.curveMonotoneX)
        .x(d => x(d.date))
        .y(d => y(d.value));

    let gt = g.select('g.gt');
    let traces = gt.selectAll('g.trace').data(data);
    traces.exit().remove();
    traces.enter().append('g')
        .attr('class', 'trace')
        .merge(traces)
        .each(function(d, i) {
            let patht = d3.select(this).selectAll('path.thk').data([0]);
            patht.enter().append('path')
                .attr('class', 'thk')
                .attr('filter', 'url(#f1)')
                .merge(patht)
                .attr('stroke', d.color)
                // .transition()
                .attr('d', line(d.points));
            let path = d3.select(this).selectAll('path.thn').data([0]);
            path.enter().append('path')
                .attr('class', 'thn')
                .merge(path)
                .attr('stroke', d.color)
                // .transition()
                .attr('d', line(d.points));
        })
    let legends = gt.selectAll('g.legend').data(data);
    legends.exit().remove();
    legends.enter().append('g')
        .attr('class', 'legend')
        .merge(legends)
        .each(function(d, i) {
            let text = d3.select(this).selectAll('text.txt').data([0]);
            text.enter().append('text')
                .attr('class', 'txt txt-' + i)
                .attr('x', 10)
                .merge(text)
                .attr('fill', d.color)
                .attr('y', 15 + i * 15)
                .text(d.name);
        });

    /* select area */
    let bisectDate = d3.bisector(d => d.date).left;
    let bisectPoints = [];
    if(data.length && (config.bucketBase == 'hour' || config.bucketBase == 'day')) {
        let extremes = d3.extent(data[0].points, f => f.date);
        let startBase = moment(extremes[0]).startOf(config.bucketBase);
        let pointer = startBase.valueOf();
        let increment = config.bucketBase == 'hour' ? 3600000 : 86400000;
        do {
            bisectPoints.push(pointer);
        } while((pointer = pointer + increment) < extremes[1]);
        bisectPoints.push(extremes[1]);
    }

    function bisectPoint(tx, backward) {
        let i = d3.bisector(d => d).left(bisectPoints, x.invert(tx), 1);
        let d0 = bisectPoints[i - 1];
        let d1 = bisectPoints[i];
        return x(backward ? d0 : d1);
    }
    let rectro = svg.select('rect.ro')
        .attr('width', width)
        .attr('height', height)
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
        .attr('fill', 'transparent')
    rectro.on('mouseenter', function() {
        let mouse = d3.mouse(this);
        let ptr = g.append('g').attr('class', 'ptr');
        ptr.append('rect')
            .attr('width', 1)
            .attr('x', mouse[0])
            .attr('height', height);
        ptr.append('text')
            .attr('x', mouse[0] + 10)
            .attr('y', 15);
        
    }).on('mousemove', function() {
        let mouse = d3.mouse(this);
        let x0 = x.invert(mouse[0]);
        let flipTextAnchor = mouse[0] > width - 100;
        g.select('.ptr rect')
            .attr('x', mouse[0]);
        g.select('.ptr text')
            .attr('x', mouse[0] + (flipTextAnchor ? -10 : 10))
            .attr('text-anchor', flipTextAnchor ? 'end' : 'start')
            .text(moment(x0).format('DD/MM/YYYY HH:mm'));
        
        let i = null;
        let points_count = data.map(p => p.points.length);
        if(points_count.every(c => points_count[0] === c)) i = bisectDate(data[0].points, x0, 1);
        let secondhalf = mouse[0] > width / 2;
        for(let d in data) {
            let points = data[d];
            let di = i;
            if(!di) di = bisectDate(points.points, x0, 1);
            let d0 = points.points[di - 1];
            let d1 = points.points[di];
            let txt = g.select(`text.txt-${d}`)
                .attr('x', secondhalf ? 10 :  width - 10)
                .attr('text-anchor', secondhalf ? 'start' : 'end')
            if(d0 && d1) {
                let p = d0.date - x0 > x0 - d1.date ? d0 : d1;
                txt.text(`${points.name} : ${p.value} ${p.info || ''}`);
            } else  txt.text(`${points.name}`);
        }
    }).on('mouseleave', function() {
        g.select('g.ptr').remove();
        for(let d in data) {
            let points = data[d];
            g.select(`text.txt-${d}`)
                .text(`${points.name}`);
        }
    })
    if(!config.disableTrack)
    rectro.call(d3.drag()
        .on('start', function(d) {
            let coords = d3.mouse(this);
            this.dropX = coords[0];
            g.selectAll('rect.rs').remove();
            if(this.est && config.onZoom) config.onZoom(null, null);
            this.est = false;
        })
        .on('drag', function(d) {
            let coords = d3.mouse(this);
            let tarX = coords[0];
            let rect = g.selectAll('rect.rs').data([0]);
            if(!this.est && Math.abs(tarX - this.dropX) > 3) {
                rect.enter().append('rect')
                    .attr('class', 'rs')
                    .attr('fill', 'rgba(0,0,0,.1')
                    .attr('height', height)
                    .on('click', function() {
                        this.remove();
                        if(config.onZoom) config.onZoom(null, null);
                    });
                if(config.bucketSize) {
                    let time = x.invert(tarX);
                    let base = moment(time);
                    if(config.bucketBase == 'hour') base = base[tarX > this.dropX ? 'startOf' : 'endOf']('hour');
                    if(config.bucketBase == 'day') base = base[tarX > this.dropX ? 'startOf' : 'endOf']('day');
                    this.dropX = x(base.valueOf());
                }
                this.est = true;
            }
            tarX = bisectPoint(tarX, this.dropX > tarX);
            if(data.length == 0) return;
            if(tarX < this.dropX) rect.attr('x', tarX);
            else rect.attr('x', this.dropX);
            rect.attr('width',  Math.abs(this.dropX - tarX));
        })
        .on('end', function(d) {
            if(!this.est) return;
            let x1 = this.dropX;
            let x2 = d3.mouse(this)[0];
            x2 = bisectPoint(x2);
            let points = [x1, x2];
            if(x1 > x2) points.reverse();
            points = points.map(p => x.invert(p));
            if(config.onZoom) config.onZoom(points[0], points[1]);
        })
    );
}

function setRange(starttime, endtime, el, config) {
    let {height} = config;
    let x = getX(config);
    let x0 = x(starttime);
    let x1 = x(endtime);
    let svg = d3.select(el).select('svg'), g = svg.select('g.ulg-g');
    let rc = svg.select('rect.ro')._groups[0][0];
    if(rc) rc.est = true;
    g.select('rect.rs').remove();
    g.append('rect').attr('x', x0)
        .attr('width', x1 - x0)
        .attr('class', 'rs')
        .attr('fill', 'rgba(0,0,0,.1')
        .attr('height', height)
        .on('click', function() {
            this.remove();
            if(config.onZoom) config.onZoom(null, null);
        });
}

function getConfigWithDimen(el, config) {
    let pn = el.parentNode;
    let margin = {top:20, left: 30, right: 10, bottom: 20};
    let maxY = getMaxY(config);
    if(maxY > 100000) margin.left = 60;
    else if(maxY > 1000) margin.left = 50;
    else if(maxY > 100) margin.left = 40;
    if(!config.height) config.height = pn.offsetHeight - margin.top - margin.bottom;
    if(!config.width) config.width = pn.offsetWidth - margin.left - margin.right;
    config.margin = margin;
    return config;
}

export default class UltraLineGraph extends Component {
    state = {
        margin: {top:20, left: 30, right: 10, bottom: 20},
        height: 0,
        width: 0
    }
    componentDidMount() {
        let el = ReactDOM.findDOMNode(this);
        let config = getConfigWithDimen(el, this.props.config);
        this.setState({height:config.height,width:config.width,margin:config.margin});
        drawLineChart(el, config);
    }
    componentWillReceiveProps(props) {
        if(JSON.stringify(props.config) != JSON.stringify(this.props.config)) {
            let el = ReactDOM.findDOMNode(this);
            let config = getConfigWithDimen(el, props.config);
            this.setState({height:config.height,width:config.width,margin:config.margin});
            drawLineChart(el, config);
        }
    }
    setRange = (starttime, endtime) => {
        let config = this.props.config;
        let {width, height} = this.state;
        config.width = width;
        config.height = height;
        let el = ReactDOM.findDOMNode(this);
        setRange(starttime, endtime, el, config);
    }
    renderSvg() {
        let config = this.props.config;
        let data = config.data;
        let {height, width, margin} = this.state;
        return (
            <svg>
                <defs>
                    <filter id="f1" x="0" y="0">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="5"></feGaussianBlur>
                    </filter>
                    <filter id="f2" x="-50%" y="-50%" width="200%" height="200%">
                        <feGaussianBlur in="SourceGraphic" stdDeviation="1"></feGaussianBlur>
                    </filter>
                </defs>
                <g transform={`translate(${margin.left}, ${margin.top})`} className="ulg-g">
                    <g className="y grid"></g>
                    <g className="x grid"></g>
                    <g className="y axis"></g>
                    <g className="x axis"></g>
                    <text className="ult" x={width / 2} height={10}>{config.name}</text>
                    {data.length == 0 && <text className="em" x={width/2} y={height/2}>No Data</text>}
                    <g className="gt"></g>
                </g>
                <rect className="ro"></rect>
            </svg>
        )
    }
    render() {
        return (
            <div className="ulg">
                {this.renderSvg()}
            </div>
        )
    }
}