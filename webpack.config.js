var webpack = require('webpack')
var path = require('path')
var libraryName = 'cosmodog-dl'

var UglifyJsPlugin = webpack.optimize.UglifyJsPlugin
var env = process.env.WEBPACK_ENV

var plugins = []
var outputFile

if (env === 'build') {
  plugins.push(new UglifyJsPlugin({ minimize: true }))
  outputFile = libraryName + '.min.js'
} else {
  outputFile = libraryName + '.js'
}

var config = {
  entry: ['./src/Data.js'],
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: outputFile,
    library: libraryName,
    libraryTarget: 'umd',
    umdNamedDefine: true
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: 'babel-loader'
        }
      }, {
        test: /\.js$/,
        loader: 'eslint-loader',
        exclude: /node_modules/
      }
    ]
  },
  resolve: {
    // root: path.resolve('./src'),
    extensions: ['.js']
  },
  plugins: plugins
}

module.exports = config

// module.exports = (env = {}) => {
//   const host = typeof (env.HOST) === 'string' ? env.HOST : 'localhost'
//   const port = typeof (env.PORT) === 'number' ? env.PORT : 9600

//   return {
//     entry: ['./src/index.js'],
//     output: {
//       filename: 'bundle.js',
//       path: path.resolve(__dirname, 'build'),
//       publicPath: '/'
//     },
//     devtool: 'source-map',
//     devServer: {
//       historyApiFallback: true,
//       contentBase: path.join(__dirname, 'build'),
//       compress: true,
//       host,
//       port
//     },
//     module: {
//       rules: [
//         {
//           enforce: 'pre',
//           test: /\.js$/,
//           exclude: new RegExp('(node_modules|ui\\' + path.sep + 'components|CVS)'),
//           loader: 'eslint-loader',
//           options: {
//             emitWarning: true
//           }
//         },
//         {
//           test: /\.css$/,
//           use: [ 'style-loader', 'css-loader' ]
//         },
//         {
//           test: /\.(eot|ttf|woff|woff2)(\?v=\d+\.\d+\.\d+)?$/,
//           loader: 'file-loader',
//           options: {
//             name: 'fonts/[name].[ext]'
//           }
//         },
//         {
//           test: /\.js$/,
//           exclude: /(node_modules|CVS)/,
//           use: {
//             loader: 'babel-loader'
//           }
//         }, {
//           test: /\.html$/,
//           exclude: /(node_modules|CVS)/,
//           use: ['file-loader?name=[name].[ext]']
//         }, {
//           test: /\.(png|jpg|svg)$/,
//           exclude: /(node_modules|CVS)/,
//           use: ['url-loader']
//         }
//       ]
//     },
//     resolve: {
//       alias: {
//         'react': path.join(__dirname, 'node_modules', 'react')
//       },
//       extensions: [' ', '.js']
//     },
//     plugins: [
//       new webpack.ProvidePlugin({
//         'fetch': 'imports-loader?this=>global!exports-loader?global.fetch!whatwg-fetch'
//       }),
//       new HtmlWebpackPlugin({
//         title: 'Vertex O-series'
//         // template: __dirname+'/src/html/index.html'
//       })
//     ]
//   }
// }
