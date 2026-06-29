import { describe, it, expect } from 'vitest';
import {
  genId,
  validate,
  defaultButtons,
  defaultList,
  defaultMedia,
  defaultPoll,
  defaultCarousel,
  defaultPix,
} from '../quickAnswersHelpers';

describe('quickAnswersHelpers', () => {
  describe('genId', () => {
    it('gera id no formato prefix_timestamp_index', () => {
      expect(genId('btn', 3)).toMatch(/^btn_\d+_3$/);
    });
    it('prefixos diferentes não colidem', () => {
      expect(genId('a', 0)).not.toBe(genId('b', 0));
    });
  });

  describe('defaults', () => {
    it('defaultPoll: 2 opções vazias, 1 seleção, sem captura, on_answer null', () => {
      const p = defaultPoll();
      expect(p.options).toEqual(['', '']);
      expect(p.max_selections).toBe(1);
      expect(p.capture_results).toBe(false);
      expect(p.on_answer).toBeNull();
    });
    it('defaultButtons: 1 botão vazio', () => {
      expect(defaultButtons().buttons).toHaveLength(1);
    });
    it('defaultCarousel: 1 card com 1 botão quickreply', () => {
      const c = defaultCarousel();
      expect(c.cards).toHaveLength(1);
      expect(c.cards[0].buttons[0].type).toBe('quickreply');
    });
    it('defaultPix: chave aleatória EVP; defaultMedia: imagem; defaultList: 1 seção/1 linha', () => {
      expect(defaultPix().pixType).toBe('EVP');
      expect(defaultMedia().media_type).toBe('image');
      expect(defaultList().sections).toHaveLength(1);
      expect(defaultList().sections[0].rows).toHaveLength(1);
    });
  });

  describe('validate', () => {
    const B = defaultButtons();
    const L = defaultList();
    const M = defaultMedia();
    const P = defaultPoll();
    const C = defaultCarousel();
    const X = defaultPix();

    it('exige atalho com ao menos 2 caracteres', () => {
      expect(validate('a', 'text', 'oi', B, L, M, P, C, X).shortcut).toBeDefined();
    });
    it('text: mensagem vazia → erro de body; preenchida → sem erros', () => {
      expect(validate('ola', 'text', '   ', B, L, M, P, C, X).body).toBeDefined();
      expect(Object.keys(validate('ola', 'text', 'Olá!', B, L, M, P, C, X))).toHaveLength(0);
    });
    it('interactive_buttons: body vazio → erro; sem botões → erro de buttons', () => {
      expect(validate('ola', 'interactive_buttons', '', { ...B, body: '' }, L, M, P, C, X).body).toBeDefined();
      expect(
        validate('ola', 'interactive_buttons', '', { ...B, body: 'oi', buttons: [] }, L, M, P, C, X).buttons,
      ).toBeDefined();
    });
    it('list: body vazio → erro de body', () => {
      expect(validate('ola', 'list', '', B, { ...L, body: '' }, M, P, C, X).body).toBeDefined();
    });
    it('media: url vazia → erro de url', () => {
      expect(validate('ola', 'media', '', B, L, { ...M, url: '' }, P, C, X).url).toBeDefined();
    });
    it('poll: pergunta vazia → erro; menos de 2 opções → erro de options', () => {
      expect(validate('ola', 'poll', '', B, L, M, { ...P, question: '' }, C, X).question).toBeDefined();
      expect(
        validate('ola', 'poll', '', B, L, M, { ...P, question: 'q?', options: ['uma'] }, C, X).options,
      ).toBeDefined();
    });
    it('carousel: 0 cards / card sem imagem / card sem texto → erro de cards', () => {
      expect(validate('ola', 'carousel', '', B, L, M, P, { ...C, cards: [] }, X).cards).toBeDefined();
      const noImg = { ...C, cards: [{ image: '', title: 't', footer: '', buttons: [] }] };
      expect(validate('ola', 'carousel', '', B, L, M, P, noImg, X).cards).toBeDefined();
      const noTitle = { ...C, cards: [{ image: 'http://x', title: '', footer: '', buttons: [] }] };
      expect(validate('ola', 'carousel', '', B, L, M, P, noTitle, X).cards).toBeDefined();
    });
    it('pix: chave vazia → erro de pixKey', () => {
      expect(validate('ola', 'pix', '', B, L, M, P, C, { ...X, pixKey: '' }).pixKey).toBeDefined();
    });
  });
});
