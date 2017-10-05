/**
 * @fileOverview
 * Tests for AST Generation & Transformation
 *
 * @name ast.spec.js
 * @author Bailey Cosier <bailey@cosier.ca>
 * @license MIT
 */

const chai = require('chai');
const expect = chai.expect;

const logger = require('../lib/utils').logger;
const samples = require('./samples');

const Processor = require('../lib/abstractor');
const ast_gen = Processor.ast_gen;
const C = require('../lib/constants');

const COMM = C.COMM;
const CODE = C.CODE;
const CHAR = C.CHAR;
const DEF  = C.DEF;
const MEMB = C.MEMB;
const NA = C.NA;

// ////////////////////////////////////////////////////////////////////

/**
 * Utility log namespaced helper
 */
const log = logger('spec');
const helpers = require('./test_helper');
const setup = helpers.setup;

// ////////////////////////////////////////////////////////////////////
describe('Streaming Input', async () => {
  it('should accept a streaming buffer', async () => {
    let ast = await ast_gen(setup().input);

    expect(ast).to.have.property('index');
    expect(ast).to.have.property('comments');
    expect(ast).to.have.property('code');
    expect(ast).to.have.property('source');
  });
});

// ////////////////////////////////////////////////////////////////////
describe('Functions', async () => {
  let ast;

  before(async () => {
    ast = await ast_gen(setup(samples.FUNC).input);
  });

  it('should transform functions into `code` nodes', async () => {
    expect(ast.index[3].type).to.equal(CODE);
    expect(ast.index[4].type).to.equal(CODE);

    expect(ast.keys(COMM).length).to.equal(1);
    expect(ast.keys(CODE).length).to.equal(1);
  });

  it('should have valid indexes on `code` nodes', async () => {
    expect(ast.index[3].type).to.equal(C.CODE);
    expect(ast.index[4].node_id).to.equal(3);
    expect(ast.index[5].node_id).to.equal(3);
    expect(ast.index[6].node_id).to.equal(3);
    expect(ast.index[7].node_id).to.equal(3);
    expect(ast.index[8].node_id).to.equal(3);
  });

  /**
   * Should backtrace the previous def into a code point,
   * This happens due to CHAR(s) on lines before a code point.
   */
  it('should allow indexing `code` nodes', async () => {
    expect(ast.index[3].type).to.equal('code');
  });
});

describe('Realworld functions', async () => {
  let ast;

  before(async () => {
      ast = await ast_gen(setup(samples.EXAMPLE_1).input);
  })

  it('should parse `code` nodes', async () => {
      const node = ast[CODE][36];
      const comment_id = ast.keys(COMM)[1];
      const comment = ast[COMM][comment_id];
      expect(node.assocs).to.deep.equal({ [COMM]: [comment.id] })
      expect(ast.count(COMM)).to.deep.equal({ [COMM]: 2 })
  })
});

// ////////////////////////////////////////////////////////////////////
describe('Structures', async () => {
  let ast;

  before(async () => {
    ast = await ast_gen(setup(samples.STRUCT).input);
  });

  it('should associate comments to def members', async () => {
    const comm_node = ast.node(0);
    const def_node = ast.node(3);

    expect(comm_node.assocs).to.have.property('defs');
    expect(def_node.assocs).to.have.property('comments');

    expect(comm_node.assocs.defs[0]).to.equal(def_node.id);
    expect(def_node.assocs.comments[0]).to.equal(comm_node.id);
  });

  it('should handle function structs', async () => {
    expect(ast.keys(DEF).length).to.equal(1);
    expect(ast.keys(COMM).length).to.equal(2);
  });

  it('should handle inner members', async () => {
    const lookup = ast.index[5];
    // const def_node = ast.node(3);
    const comm_node = ast.node(5);
    const inner_node = ast.node(7);

    expect(lookup.type).to.equal('comments');
    expect(inner_node.assocs).to.have.property('comments');
    expect(inner_node.assocs.comments[0]).to.equal(comm_node.id);
  });
});

// ////////////////////////////////////////////////////////////////////
describe('Structs & Functions Combos', async () => {
  let ast;

  before(async () => {
    ast = await ast_gen(setup(samples.STRUCT_FUNCS).input);
  });

  it('should parse CODE,DEF,COMM together', async () => {
    expect(ast.keys(CODE).length).to.equal(1);
    expect(ast.keys(DEF).length).to.equal(1);
    expect(ast.keys(COMM).length).to.equal(3);
  });
});

// ////////////////////////////////////////////////////////////////////
describe('Struct Declarations', async () => {
  let ast;

  before(async () => {
    ast = await ast_gen(setup(samples.STRUCT_DECLS).input);
  });

  it('should parse a list of declarations', async () => {
    // Only a few decls have a comment
    expect(ast.keys(COMM).length).to.equal(3);

    // We have 25 declarations
    expect(ast.keys(DEF).length).to.equal(25);

    // These nodes do have comments of various types
    expect(ast.node(16).assocs).to.have.property(COMM);
    expect(ast.node(21).assocs).to.have.property(COMM);
    expect(ast.node(27).assocs).to.have.property(COMM);

    // Check for recipricol comment associations
    expect(ast.node(13).assocs[DEF][0]).to.equal(16);
    expect(ast.node(20).assocs[DEF][0]).to.equal(21);
    expect(ast.node(24).assocs[DEF][0]).to.equal(27);

    // The last node should not have any associations
    expect(ast.node(32).assocs).to.not.have.property(COMM);
  });
});

describe('Comment Associations', async () => {
  let ast;

  before(async () => {
    ast = await ast_gen(setup(samples.COMM_SPACES).input);
  });

  it('should recognize independent comments', async () => {
    expect(ast.keys(COMM).length).to.equal(3);
    expect(ast.node(8).assocs).to.not.have.property(COMM);

    expect(ast.node(3).assocs[DEF][0]).to.equal(4);
    expect(ast.node(4).assocs[COMM][0]).to.equal(3);
  });
});


// ////////////////////////////////////////////////////////////////////
describe('Documentated Function', async () => {
  let ast;

  before(async () => {
    ast = await ast_gen(setup(samples.STRUCT_DOC).input);
  });

  it('should recognize multi-line documentation', async () => {
    expect(ast.keys(CODE).length).to.equal(1);
  });
});


// ////////////////////////////////////////////////////////////////////
describe('Enumerations', async () => {
  let ast;

  before(async () => {
    ast = await ast_gen(setup(samples.ENUMS).input);
  });

  it('should recognize multi-line documentation', async () => {
    expect(ast.count(DEF)).to.deep.equal({[DEF]: 2});
    expect(ast.count(COMM)).to.deep.equal({[COMM]: 6});
    expect(ast.count(CODE)).to.deep.equal({[CODE]: 0});
    expect(ast.index[78].type).to.equal(DEF);
  });
});

// ////////////////////////////////////////////////////////////////////
describe('Exotic Enums', async () => {
  let ast;

  before(async () => {
      ast = await ast_gen(setup(samples.ENUMS_SINGLE_LINE).input);
  })

  it('should recognize single-line enum members', async () => {
      expect(ast.count(DEF)).to.deep.equal({[DEF]: 2})
      expect(ast.count(COMM)).to.deep.equal({[COMM]: 3})

      expect(ast.inner(9, MEMB).length).to.equal(5)
      expect(ast.inner(14, COMM).length).to.equal(1)

      expect(ast.index['14.1'].type).to.equal(COMM)
      expect(ast.index['14.1'].parent).to.equal(14)
      
      expect(ast.node(14).index['14.1']).to.deep.equal({ind: 0, type: COMM})
      expect(ast.node(14).inner[0].type).to.equal(COMM)
  })
});

describe('Macros', async () => {
  let ast;

  before(async () => {
      ast = await ast_gen(setup(samples.MACROS).input);
  })

  it('should recognize macros', async () => {
      expect(ast.count(COMM)).to.deep.equal({ [COMM]: 4 })
      expect(ast.count(CODE)).to.deep.equal({ [CODE]: 3 })
      expect(ast.count(CHAR)).to.deep.equal({ [CHAR]: 1 })
  })
});