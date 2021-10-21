import { Location } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {CdkDrag, CdkDragDrop, CdkDropList} from '@angular/cdk/drag-drop';
import { Piece } from '../models/piece';
import { AppConfigService } from '../app-config.service';
import { MatDialog } from '@angular/material/dialog';
import { ResultDialogComponent, ResultDialogOutputData } from '../commons/dialogs/result-dialog/result-dialog.component';
import { Router } from '@angular/router';
import { AudioPuzzleManager, PlayingMode } from '../models/audio-puzzle-manager';
import { Puzzle } from '../models/puzzle';

@Component({
  selector: 'app-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss']
})
export class PlayComponent implements OnInit, OnDestroy {

  // données fournies par les formulaires précédents
  state: any;

  // réglage par défaut et difficulté
  nb_pieces = AppConfigService.settings.difficulty.default_pieces;
  nb_instruments = AppConfigService.settings.difficulty.default_instruments;
  available_solution = AppConfigService.settings.difficulty.default_available_solution;
  colors: Array<string> = ['aliceblue','antiquewhite','burlywood','darkkhaki']

  puzzle: Puzzle;

  // gestion de l'audio
  audio_manager: AudioPuzzleManager;
  modes = PlayingMode;

  // timer
  time: number = 0;
  timer;

  constructor(
    public dialog: MatDialog,
    private location: Location,
    private router: Router) { 

      this.state = this.location.getState();
      
      /*if(!this.state.training && (!this.state.form || !this.state.difficulty)) {
        this.router.navigate(["/"]);
      }*/

      if(this.state.difficulty) {
        this.nb_instruments = this.state.difficulty.nb_instruments;
        this.nb_pieces = this.state.difficulty.nb_pieces;
        this.available_solution = this.state.difficulty.available_solution
      }
  }

  ngOnInit(): void {
    this.puzzle = new Puzzle(this.nb_pieces, this.nb_instruments)
    this.audio_manager = new AudioPuzzleManager(this.puzzle);
  }

  ngOnDestroy(): void {
    this.audio_manager.stopAll();
  }

  getIndex(piece: Piece): string {
    return String.fromCharCode('a'.charCodeAt(0) + piece.index);
  }

  /**
   * échange l'emplacement des pièces lors d'un drag and drop
   * @param event 
   */
  drop(event: CdkDragDrop<any>): void {
    this.puzzle.pieces[event.previousContainer.data.instrument][event.previousContainer.data.order] = event.container.data.item;
    this.puzzle.pieces[event.container.data.instrument][event.container.data.order] = event.previousContainer.data.item
  }

  /**
   * condition d'acception du drag and drop pour les lignes
   * @param item 
   * @param drop 
   * @returns si la piece peut être déplacée vers la ligne d'instrument
   */
  rightPartitionPredicate = (item: CdkDrag<Piece>, drop?: CdkDropList<{item:Piece}>) => {
    return drop.data.item.instrument % this.nb_instruments === item.dropContainer.data.item.instrument;
  }

  startTimer() {
    if (this.time === 0) {
      this.timer = setInterval(() => {
        this.time += 0.5;
      }, 500)
    }
  }

  /**
   * Ouvre la fenêtre de récapitulatif
   */
  openResultDialog(): void {
    this.audio_manager.stopAll();
    clearInterval(this.timer);

    const dialogRef = this.dialog.open(ResultDialogComponent, 
      {
        disableClose: true,
        data: {
          duration: this.time,
          pieces: this.nb_pieces,
          success_by_row: this.puzzle.correctsPiecesByRow(),
          success_total: this.puzzle.correctsPieces(),
          can_change_difficulty: !this.state.training
        }
      });

    dialogRef.afterClosed().subscribe((result:ResultDialogOutputData) => {
      if (result === ResultDialogOutputData.difficulty) {
        this.router.navigate(['/difficulty'],{state: this.state});
      } else if (result === ResultDialogOutputData.quit) {
        this.router.navigate(['/']);
      } else if (result === ResultDialogOutputData.retry) {
        this.puzzle.buildPuzzle();
        this.time = 0;
      }
    });
  }
}

