import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Texto fixo. Cada frase descreve o comportamento real: ao mudar uma regra, atualize aqui também. */
@Component({
  selector: 'app-help',
  imports: [RouterLink],
  template: `
    <h1>Ajuda</h1>
    <p class="intro">Veja como usar cada parte do FinanceTable.</p>

    <section class="panel">
      <h2>Primeiros passos</h2>
      <ol>
        <li>Sua conta já começa com categorias prontas, como Salário, Alimentação e Moradia.</li>
        <li>Em <a routerLink="/movimentacoes">Movimentações</a>, registre o que você recebeu e o que gastou.</li>
        <li>Em <a routerLink="/inicio">Início</a>, acompanhe o saldo, os totais do mês e os gráficos.</li>
      </ol>
    </section>

    <section class="panel">
      <h2>Receitas e despesas</h2>
      <ul>
        <li>Receitas aumentam o saldo e despesas diminuem. O saldo é calculado com tudo o que você registrou.</li>
        <li>Toda movimentação precisa de descrição, valor maior que zero, categoria e data.</li>
        <li>Use os filtros para pesquisar pela descrição, por tipo, por categoria ou por período.</li>
        <li>Pelos botões de cada linha, você pode editar ou excluir uma movimentação.</li>
      </ul>
    </section>

    <section class="panel">
      <h2>Categorias</h2>
      <ul>
        <li>Crie categorias próprias de receita ou de despesa e altere o nome das que já existem.</li>
        <li>
          Uma categoria com movimentações não pode ser excluída. Antes, passe essas movimentações para outra
          categoria ou exclua-as.
        </li>
      </ul>
    </section>

    <section class="panel">
      <h2>Metas</h2>
      <ul>
        <li>Crie um objetivo com o valor que deseja juntar e a data em que pretende alcançá-lo.</li>
        <li>Use <strong>Registrar valor</strong> sempre que guardar dinheiro para a meta.</li>
        <li>Para corrigir o valor guardado, edite a meta.</li>
        <li>As metas são acompanhadas à parte: registrar um valor nelas não altera o seu saldo.</li>
      </ul>
    </section>

    <section class="panel">
      <h2>Relatórios e planilha</h2>
      <ul>
        <li>Consulte um mês ou escolha um período de até 5 anos.</li>
        <li>Compare dois dos últimos 24 meses e veja a diferença entre eles.</li>
        <li>
          <strong>Exportar planilha</strong> baixa um arquivo CSV com as movimentações do período, que pode ser aberto
          no Excel.
        </li>
      </ul>
    </section>

    <section class="panel">
      <h2>Conta e segurança</h2>
      <ul>
        <li>Em <a routerLink="/perfil">Perfil</a>, você pode alterar seu nome e sua senha.</li>
        <li>
          Esqueceu a senha? Na tela de acesso, use <strong>Esqueci minha senha</strong>. O link enviado por e-mail vale
          por 30 minutos e só pode ser usado uma vez.
        </li>
        <li>Depois de várias tentativas erradas, o acesso é bloqueado por alguns minutos. Basta aguardar.</li>
        <li>Suas informações só aparecem na sua conta. Em um computador compartilhado, lembre-se de sair ao terminar.</li>
      </ul>
    </section>
  `,
  styles: `
    :host {
      display: block;
      max-width: 720px;
    }

    h1 {
      margin: 0 0 8px;
      font-size: 26px;
      font-weight: 600;
    }

    .intro {
      margin: 0 0 20px;
      color: var(--ft-text-muted);
    }

    .panel {
      margin-bottom: 16px;
      padding: 20px 24px;
      border: 1px solid var(--ft-border);
      border-radius: 16px;
      background: #fff;
    }

    h2 {
      margin: 0 0 10px;
      font-size: 18px;
      font-weight: 600;
    }

    ol,
    ul {
      margin: 0;
      padding-left: 20px;
      line-height: 1.5;
    }

    li + li {
      margin-top: 6px;
    }

    a {
      color: var(--ft-brand);
      font-weight: 600;
    }

    @media (max-width: 599px) {
      .panel {
        padding: 16px;
      }
    }
  `,
})
export class Help {}
