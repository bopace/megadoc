const React = require('react');
const { Link } = require('react-router');

const HomeScreen = require('../screens/Home');

module.exports = function(api, config) {
  const { readme } = config;
  const readmeSections = readme && readme.source.toc.filter(function(section) {
    return section.level === 2;
  });

  // api.outlets.add('SinglePageLayout::ContentPanel', {
  //   key: 'home',
  //   component: React.createClass({
  //     render() {
  //       return (
  //         <div>
  //           <header className="single-page-layout__root-link" id="/" />
  //           <HomeScreen />
  //         </div>
  //       );
  //     }
  //   })
  // });

  // api.outlets.add('SinglePageLayout::Sidebar', {
  //   key: 'home',
  //   component: React.createClass({
  //     render() {
  //       return (
  //         <div>
  //           <h1 className="single-page-layout__home-link">
  //             <Link to="home">
  //               {config.title}
  //             </Link>

  //           </h1>

  //           <ul className="">
  //             {readme && readmeSections.map(this.renderSection)}
  //           </ul>
  //         </div>
  //       );
  //     },

  //     renderSection(section) {
  //       return (
  //         <li key={section.id}>
  //           <Link
  //             to="readme"
  //             params={{ splat: '/' + section.scopedId }}
  //             children={section.text}
  //           />
  //         </li>
  //       );
  //     }
  //   }),
  // });
};
